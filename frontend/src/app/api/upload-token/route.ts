/**
 * POST /api/upload-token
 *
 * Server-side upload for token images + metadata to Storj (S3-compatible).
 * Credentials are read from process.env.STORJ_* and never reach the browser.
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
 *
 * Both URIs are plain HTTPS URLs pointing to the Storj bucket.
 * The bucket must be public (or have a share link) for images to display.
 */

import { type NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { verifyMessage } from "viem";

const STORJ_ACCESS_KEY_ID = process.env.STORJ_ACCESS_KEY_ID ?? "";
const STORJ_SECRET_ACCESS_KEY = process.env.STORJ_SECRET_ACCESS_KEY ?? "";
const STORJ_ENDPOINT = process.env.STORJ_ENDPOINT ?? "";
const STORJ_BUCKET = process.env.STORJ_BUCKET ?? "";
const STORAGE_BASE_URL = process.env.NEXT_PUBLIC_STORAGE_BASE_URL ?? "";

class StorageUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageUploadError";
  }
}

function getS3Client(): S3Client {
  if (!STORJ_ACCESS_KEY_ID || !STORJ_SECRET_ACCESS_KEY || !STORJ_ENDPOINT || !STORJ_BUCKET) {
    throw new StorageUploadError("Storj credentials not configured");
  }
  return new S3Client({
    endpoint: STORJ_ENDPOINT,
    region: "us1",
    credentials: {
      accessKeyId: STORJ_ACCESS_KEY_ID,
      secretAccessKey: STORJ_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true,
  });
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
}

function getExtension(filename: string): string {
  const ext = filename.split(".").pop();
  return ext ? `.${ext.toLowerCase()}` : "";
}

async function uploadToStorj(
  s3: S3Client,
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  await s3.send(
    new PutObjectCommand({
      Bucket: STORJ_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  // ?wrap=0 tells Storj share links to serve the raw file instead of the download portal
  return `${STORAGE_BASE_URL}/${key}?wrap=0`;
}

export async function POST(req: NextRequest) {
  try {
    const s3 = getS3Client();

    const formData = await req.formData();
    const image = formData.get("image");
    const name = formData.get("name");
    const symbol = formData.get("symbol");
    const description = formData.get("description");
    const telegram = formData.get("telegram");
    const twitter = formData.get("twitter");
    const website = formData.get("website");

    // ── Wallet auth (P0-1) ───────────────────────────────────────────────────
    // Require EIP-191 proof of wallet ownership to prevent bucket spam.
    const walletAddress = formData.get("walletAddress");
    const signature = formData.get("signature");
    const message = formData.get("message");

    if (
      typeof walletAddress !== "string" ||
      typeof signature !== "string" ||
      typeof message !== "string" ||
      !walletAddress || !signature || !message
    ) {
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

    if (!image || !(image instanceof File)) {
      return NextResponse.json({ error: "Missing image file" }, { status: 400 });
    }
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Missing token name" }, { status: 400 });
    }
    if (!symbol || typeof symbol !== "string" || !symbol.trim()) {
      return NextResponse.json({ error: "Missing token symbol" }, { status: 400 });
    }

    // ── File validation ──────────────────────────────────────────────────────
    const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
    const ALLOWED_MIME = ["image/png", "image/jpeg", "image/webp", "image/gif"];
    const ALLOWED_EXT  = [".png", ".jpg", ".jpeg", ".webp", ".gif"];

    if (image.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large (max 5 MB)" }, { status: 400 });
    }
    if (!ALLOWED_MIME.includes(image.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: PNG, JPEG, WEBP, GIF" },
        { status: 400 }
      );
    }
    const imgExt = getExtension(image.name) || ".png";
    if (!ALLOWED_EXT.includes(imgExt)) {
      return NextResponse.json(
        { error: "Invalid file extension. Allowed: .png, .jpg, .jpeg, .webp, .gif" },
        { status: 400 }
      );
    }

    // 1. Upload image
    const imageBuffer = Buffer.from(await image.arrayBuffer());
    const imageExt = imgExt;
    const timestamp = Date.now();
    const safeName = sanitizeFilename(name.trim());
    const imageKey = `tokens/${safeName}-${timestamp}${imageExt}`;
    const imageUri = await uploadToStorj(s3, imageKey, imageBuffer, image.type || "image/png");

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
    const metadataKey = `tokens/${safeName}-${timestamp}-metadata.json`;
    const metadataUri = await uploadToStorj(
      s3,
      metadataKey,
      Buffer.from(JSON.stringify(metadata, null, 2)),
      "application/json"
    );

    return NextResponse.json({ ok: true, imageUri, metadataUri });
  } catch (err) {
    console.error("[upload-token]", err);
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "Use POST" }, { status: 405 });
}
