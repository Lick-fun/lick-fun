/**
 * POST /api/upload-profile
 *
 * Server-side IPFS upload for profile avatars via Pinata.
 * The JWT is read from process.env.PINATA_JWT and never reaches the browser.
 *
 * Request body: multipart/form-data
 *   - avatar: File (image)
 *   - walletAddress: string (the wallet that owns this profile)
 *   - displayName: string
 *   - signature: string (EIP-191 signature of the message proving wallet ownership)
 *   - message: string (the exact message that was signed)
 *
 * Response:
 *   { ok: true, avatarUri: string, metadataUri: string }
 */

import { type NextRequest, NextResponse } from "next/server";
import { verifyMessage } from "viem";

const PINATA_JWT = process.env.PINATA_JWT ?? "";
const PINATA_API_URL = "https://api.pinata.cloud/pinning";

class IPFSUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IPFSUploadError";
  }
}

function parsePinataHash(json: unknown): string {
  const data = json as { IpfsHash?: string; ipfsHash?: string };
  const cid = data.IpfsHash ?? data.ipfsHash;
  if (!cid || typeof cid !== "string") {
    throw new IPFSUploadError("Pinata returned no IPFS hash");
  }
  return `ipfs://${cid}`;
}

async function uploadToPinata(formData: FormData): Promise<string> {
  const res = await fetch(`${PINATA_API_URL}/pinFileToIPFS`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PINATA_JWT}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new IPFSUploadError(`Pinata file upload failed (${res.status}): ${text}`);
  }

  return parsePinataHash(await res.json());
}

async function uploadMetadataToPinata(metadata: Record<string, unknown>): Promise<string> {
  const res = await fetch(`${PINATA_API_URL}/pinJSONToIPFS`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PINATA_JWT}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      pinataContent: metadata,
      pinataMetadata: { name: `${metadata.walletAddress}-profile.json` },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new IPFSUploadError(`Pinata JSON upload failed (${res.status}): ${text}`);
  }

  return parsePinataHash(await res.json());
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const avatar = formData.get("avatar");
    const walletAddress = formData.get("walletAddress");
    const displayName = formData.get("displayName");
    const signature = formData.get("signature");
    const message = formData.get("message");

    if (
      !(avatar instanceof File) ||
      typeof walletAddress !== "string" ||
      typeof displayName !== "string" ||
      typeof signature !== "string" ||
      typeof message !== "string"
    ) {
      return NextResponse.json(
        { error: "avatar, walletAddress, displayName, signature, and message are required" },
        { status: 400 }
      );
    }

    // Verify the wallet signature to prove ownership
    const valid = await verifyMessage({
      address: walletAddress as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });

    if (!valid) {
      return NextResponse.json(
        { error: "Invalid signature — wallet ownership not proven" },
        { status: 403 }
      );
    }

    // Upload avatar to IPFS
    const avatarForm = new FormData();
    avatarForm.append("file", avatar);
    const avatarUri = await uploadToPinata(avatarForm);

    // Upload profile metadata JSON to IPFS
    const metadataUri = await uploadMetadataToPinata({
      walletAddress,
      displayName,
      avatarUri,
      updatedAt: Date.now(),
    });

    return NextResponse.json({
      ok: true,
      avatarUri,
      metadataUri,
    });
  } catch (err) {
    console.error("[upload-profile]", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}