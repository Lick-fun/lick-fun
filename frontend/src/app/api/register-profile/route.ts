/**
 * POST /api/register-profile
 * Body: { walletAddress, signature, message, displayName?, avatarUri? }
 *
 * Stores a mapping of walletAddress → { displayName, avatarUri } in a lightweight
 * JSON file on disk. The actual avatar content lives on Storj forever regardless
 * of whether this server is running.
 *
 * Requires a valid EIP-191 signature proving the wallet owns the profile.
 * At least one of displayName or avatarUri must be provided.
 * Fields are merged with any existing profile data — you can update just one field.
 */

import { type NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { verifyMessage } from "viem";

const DATA_FILE = path.join(process.cwd(), "src", "data", "profile-metadata.json");

type ProfileEntry = { displayName: string; avatarUri: string; updatedAt: number };
type ProfileStore = Record<string, ProfileEntry>;

async function readStore(): Promise<ProfileStore> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(raw) as ProfileStore;
  } catch {
    return {};
  }
}

async function writeStore(store: ProfileStore): Promise<void> {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(store, null, 2), "utf-8");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { walletAddress, displayName, avatarUri, signature, message } = body as {
      walletAddress?: string;
      displayName?: string;
      avatarUri?: string;
      signature?: string;
      message?: string;
    };

    if (!walletAddress || !signature || !message) {
      return NextResponse.json(
        { error: "walletAddress, signature, and message are required" },
        { status: 400 }
      );
    }

    if (!displayName && !avatarUri) {
      return NextResponse.json(
        { error: "At least one of displayName or avatarUri must be provided" },
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

    const normalised = walletAddress.toLowerCase();
    const store = await readStore();
    const existing = store[normalised] ?? { displayName: "", avatarUri: "", updatedAt: 0 };

    // Merge — only overwrite the fields that were explicitly provided
    store[normalised] = {
      displayName: displayName !== undefined ? displayName.trim() : existing.displayName,
      avatarUri: avatarUri !== undefined ? avatarUri : existing.avatarUri,
      updatedAt: Date.now(),
    };

    await writeStore(store);

    return NextResponse.json({ ok: true, walletAddress: normalised });
  } catch (err) {
    console.error("[register-profile]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "Use POST" }, { status: 405 });
}