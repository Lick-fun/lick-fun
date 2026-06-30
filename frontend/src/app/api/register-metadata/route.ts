/**
 * POST /api/register-metadata
 * Body: { tokenAddress: string; metadataUri: string; imageUri: string,
 *         walletAddress: string; signature: string; message: string }
 *
 * Stores a mapping of tokenAddress → { metadataUri, imageUri } in a persistent
 * JSON index inside the configured Storj (S3-compatible) bucket. Using Storj
 * instead of local disk means the index survives Railway redeploys (Railway
 * containers have ephemeral filesystems).
 *
 * The actual image + metadata content lives on Storj forever regardless of
 * whether this server is running.
 */

import { type NextRequest, NextResponse } from "next/server";
import { verifyMessage } from "viem";
import { readMetadataIndex, writeMetadataIndex } from "@/lib/server/tokenMetadataStore";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      tokenAddress,
      metadataUri,
      imageUri,
      walletAddress,
      signature,
      message,
    } = body as {
      tokenAddress?: string;
      metadataUri?: string;
      imageUri?: string;
      walletAddress?: string;
      signature?: string;
      message?: string;
    };

    if (!tokenAddress || !metadataUri || !imageUri) {
      return NextResponse.json(
        { error: "tokenAddress, metadataUri, and imageUri are required" },
        { status: 400 }
      );
    }

    // ── Wallet auth (P0-2) ───────────────────────────────────────────────────
    // Require EIP-191 proof of wallet ownership so only the token creator
    // can register/overwrite metadata for their token.
    if (!walletAddress || !signature || !message) {
      return NextResponse.json(
        { error: "walletAddress, signature, and message are required" },
        { status: 401 }
      );
    }

    const isValid = await verifyMessage({
      address: walletAddress as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    }).catch(() => false);

    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const normalised = tokenAddress.toLowerCase();
    const store = await readMetadataIndex();

    store[normalised] = {
      metadataUri,
      imageUri,
      registeredAt: Date.now(),
    };

    await writeMetadataIndex(store);

    return NextResponse.json({ ok: true, tokenAddress: normalised });
  } catch (err) {
    console.error("[register-metadata]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "Use POST" }, { status: 405 });
}