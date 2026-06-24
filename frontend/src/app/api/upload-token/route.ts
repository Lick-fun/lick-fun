/**
 * POST /api/upload-token
 *
 * Server-side IPFS upload for token images + metadata via Pinata.
 * The JWT is read from process.env.PINATA_JWT and never reaches the browser.
 *
 * Request body: multipart/form-data
 *   - image: File
 *   - name: string
 *   - symbol: string
 *   - description?: string
 *   - telegram?: string  (full URL, e.g. https://t.me/yourtoken)
 *   - twitter?: string   (full URL, e.g. https://x.com/yourtoken)
 *   - website?: string   (full URL, e.g. https://yourtoken.com)
 *
 * Response:
 *   { ok: true, imageUri: string, metadataUri: string }
 */

import { type NextRequest, NextResponse } from "next/server";

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
      pinataMetadata: { name: metadata.name ? `${metadata.name}-metadata.json` : "metadata.json" },
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
    if (!PINATA_JWT) {
      console.error("[upload-token] PINATA_JWT is not configured");
      return NextResponse.json(
        { error: "Server IPFS configuration missing" },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const image = formData.get("image");
    const name = formData.get("name");
    const symbol = formData.get("symbol");
    const description = formData.get("description");
    const telegram = formData.get("telegram");
    const twitter = formData.get("twitter");
    const website = formData.get("website");

    if (!image || !(image instanceof File)) {
      return NextResponse.json({ error: "Missing image file" }, { status: 400 });
    }
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Missing token name" }, { status: 400 });
    }
    if (!symbol || typeof symbol !== "string" || !symbol.trim()) {
      return NextResponse.json({ error: "Missing token symbol" }, { status: 400 });
    }

    // 1. Upload image to Pinata
    const imageFormData = new FormData();
    imageFormData.append("file", image);
    imageFormData.append(
      "pinataMetadata",
      JSON.stringify({ name: `${name.replace(/\s+/g, "_")}-image${getExtension(image.name)}` })
    );

    const imageUri = await uploadToPinata(imageFormData);

    // 2. Build metadata JSON
    const metadata: Record<string, unknown> = {
      name: name.trim(),
      symbol: symbol.trim().toUpperCase(),
      description: typeof description === "string" ? description.trim() : "",
      image: imageUri,
    };

    // Social links (optional). Stored in the metadata JSON, not on-chain.
    if (typeof telegram === "string" && telegram.trim()) {
      metadata.telegram = telegram.trim();
    }
    if (typeof twitter === "string" && twitter.trim()) {
      metadata.twitter = twitter.trim();
    }
    if (typeof website === "string" && website.trim()) {
      metadata.website = website.trim();
    }

    // 3. Upload metadata JSON
    const metadataUri = await uploadMetadataToPinata(metadata);

    return NextResponse.json({ ok: true, imageUri, metadataUri });
  } catch (err) {
    console.error("[upload-token]", err);
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function getExtension(filename: string): string {
  const ext = filename.split(".").pop();
  return ext ? `.${ext}` : "";
}

export async function GET() {
  return NextResponse.json({ error: "Use POST" }, { status: 405 });
}
