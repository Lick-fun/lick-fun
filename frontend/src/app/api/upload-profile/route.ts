/**
 * POST /api/upload-profile
 *
 * Server-side upload for profile avatars to Storj (S3-compatible).
 * Credentials are read from process.env.STORJ_* and never reach the browser.
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
 *
 * Both URIs are plain HTTPS URLs pointing to the Storj bucket.
 */

import { type NextRequest, NextResponse } from "next/server";
import { verifyMessage } from "viem";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

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

function getExtension(filename: string): string {
  const ext = filename.split(".").pop();
  return ext ? `.${ext.toLowerCase()}` : ".png";
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

    // Upload avatar to Storj
    const avatarBuffer = Buffer.from(await avatar.arrayBuffer());
    const avatarExt = getExtension(avatar.name);
    const timestamp = Date.now();
    const safeWallet = walletAddress.toLowerCase().replace(/[^a-z0-9]/g, "");
    const avatarKey = `profiles/${safeWallet}-${timestamp}${avatarExt}`;
    const avatarUri = await uploadToStorj(s3, avatarKey, avatarBuffer, avatar.type || "image/png");

    // Upload profile metadata JSON to Storj
    const metadataKey = `profiles/${safeWallet}-${timestamp}-metadata.json`;
    const metadataUri = await uploadToStorj(
      s3,
      metadataKey,
      Buffer.from(
        JSON.stringify(
          {
            walletAddress,
            displayName,
            avatarUri,
            updatedAt: timestamp,
          },
          null,
          2
        )
      ),
      "application/json"
    );

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