/**
 * POST /api/register-metadata
 * Body: { tokenAddress: string; metadataUri: string; imageUri: string }
 *
 * Stores a mapping of tokenAddress → { metadataUri, imageUri } in a lightweight
 * JSON file on disk. This is just a lookup index — the actual content lives on IPFS
 * forever regardless of whether this server is running.
 */

import { type NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "src", "data", "token-metadata.json");

type MetadataStore = Record<
  string,
  { metadataUri: string; imageUri: string; registeredAt: number }
>;

async function readStore(): Promise<MetadataStore> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(raw) as MetadataStore;
  } catch {
    return {};
  }
}

async function writeStore(store: MetadataStore): Promise<void> {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  const tmpFile = `${DATA_FILE}.tmp`;
  // Atomic write: write to temp file first, then rename — prevents corruption
  // if the process is interrupted mid-write.
  await fs.writeFile(tmpFile, JSON.stringify(store, null, 2), "utf-8");
  await fs.rename(tmpFile, DATA_FILE);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tokenAddress, metadataUri, imageUri } = body as {
      tokenAddress?: string;
      metadataUri?: string;
      imageUri?: string;
    };

    if (!tokenAddress || !metadataUri || !imageUri) {
      return NextResponse.json(
        { error: "tokenAddress, metadataUri, and imageUri are required" },
        { status: 400 }
      );
    }

    const normalised = tokenAddress.toLowerCase();
    const store = await readStore();

    store[normalised] = {
      metadataUri,
      imageUri,
      registeredAt: Date.now(),
    };

    await writeStore(store);

    return NextResponse.json({ ok: true, tokenAddress: normalised });
  } catch (err) {
    console.error("[register-metadata]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "Use POST" }, { status: 405 });
}
