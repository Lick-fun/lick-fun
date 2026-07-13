/**
 * POST /api/register-profile
 * Body: { walletAddress, signature, message, displayName?, avatarUri?, xUrl?, websiteUrl?, telegramUrl? }
 *
 * Stores a mapping of walletAddress → profile metadata in a Storj-backed JSON
 * index (see lib/server/profileMetadataStore.ts). Both the avatar image and
 * this index live on Storj forever, so profile data survives Railway
 * redeploys (Railway containers have an ephemeral filesystem — local disk
 * writes are reset to the last git commit on every deploy).
 *
 * Requires a valid EIP-191 signature proving the wallet owns the profile.
 * At least one updatable field must be provided.
 * Fields are merged with any existing profile data — you can update just one field.
 */

import { type NextRequest, NextResponse } from "next/server";
import { verifyMessage } from "viem";
import { readProfileIndex, writeProfileIndex } from "@/lib/server/profileMetadataStore";

// Light URL validation — accepts only http(s) URLs, returns empty string on failure
function normalizeUrl(value: string | undefined): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    const u = new URL(trimmed);
    if (u.protocol !== "http:" && u.protocol !== "https:") return "";
    return u.toString();
  } catch {
    return "";
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      walletAddress,
      displayName,
      avatarUri,
      xUrl,
      websiteUrl,
      telegramUrl,
      signature,
      message,
    } = body as {
      walletAddress?: string;
      displayName?: string;
      avatarUri?: string;
      xUrl?: string;
      websiteUrl?: string;
      telegramUrl?: string;
      signature?: string;
      message?: string;
    };

    if (!walletAddress || !signature || !message) {
      return NextResponse.json(
        { error: "walletAddress, signature, and message are required" },
        { status: 400 }
      );
    }

    const hasAnyField =
      displayName !== undefined ||
      avatarUri !== undefined ||
      xUrl !== undefined ||
      websiteUrl !== undefined ||
      telegramUrl !== undefined;

    if (!hasAnyField) {
      return NextResponse.json(
        { error: "At least one updatable field must be provided" },
        { status: 400 }
      );
    }

    // Verify the wallet signature to prove ownership
    // ── Input validation ────────────────────────────────────────────────────
    if (displayName !== undefined && displayName.trim().length > 50) {
      return NextResponse.json(
        { error: "Display name too long (max 50 characters)" },
        { status: 400 }
      );
    }
    if (avatarUri !== undefined && avatarUri.trim() !== "" && !avatarUri.startsWith("https://")) {
      return NextResponse.json(
        { error: "Avatar URI must start with https://" },
        { status: 400 }
      );
    }

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

    const normalised = walletAddress.toLowerCase();
    const store = await readProfileIndex();
    const existing = store[normalised] ?? {
      displayName: "",
      avatarUri: "",
      xUrl: "",
      websiteUrl: "",
      telegramUrl: "",
      updatedAt: 0,
    };

    // Validate URLs before writing — surface errors to client instead of silently dropping
    if (xUrl !== undefined && xUrl.trim() !== "" && !normalizeUrl(xUrl)) {
      return NextResponse.json(
        { error: "X URL must be a valid https:// URL" },
        { status: 400 }
      );
    }
    if (websiteUrl !== undefined && websiteUrl.trim() !== "" && !normalizeUrl(websiteUrl)) {
      return NextResponse.json(
        { error: "Website URL must be a valid https:// URL" },
        { status: 400 }
      );
    }
    if (telegramUrl !== undefined && telegramUrl.trim() !== "" && !normalizeUrl(telegramUrl)) {
      return NextResponse.json(
        { error: "Telegram URL must be a valid https:// URL" },
        { status: 400 }
      );
    }

    // Merge — only overwrite the fields that were explicitly provided
    store[normalised] = {
      displayName:
        displayName !== undefined ? displayName.trim() : existing.displayName,
      avatarUri: avatarUri !== undefined ? avatarUri : existing.avatarUri,
      xUrl: xUrl !== undefined ? normalizeUrl(xUrl) : existing.xUrl,
      websiteUrl:
        websiteUrl !== undefined ? normalizeUrl(websiteUrl) : existing.websiteUrl,
      telegramUrl:
        telegramUrl !== undefined ? normalizeUrl(telegramUrl) : existing.telegramUrl,
      updatedAt: Date.now(),
    };

    await writeProfileIndex(store);

    return NextResponse.json({ ok: true, walletAddress: normalised });
  } catch (err) {
    console.error("[register-profile]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "Use POST" }, { status: 405 });
}