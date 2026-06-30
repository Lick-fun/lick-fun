/**
 * Storj-backed token metadata index store.
 *
 * Persists a single JSON object (tokenAddress → { imageUri, metadataUri, registeredAt })
 * inside the configured Storj S3 bucket. Using Storj instead of local disk means the
 * index survives Railway redeploys (Railway containers have ephemeral filesystems).
 *
 * The actual image + metadata files are already on Storj via /api/upload-token.
 * This module only owns the tiny lookup index used by /api/token-image/[address].
 *
 * Concurrency:
 *   - Each GET/PUT is a full-object read or full-object write. There is no
 *     in-memory cache; concurrent registrations may overwrite each other (last
 *     writer wins), which is acceptable since each (tokenAddress) key is only
 *     written by its own creator (enforced via wallet signature in the route).
 */

import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

const STORJ_ACCESS_KEY_ID = process.env.STORJ_ACCESS_KEY_ID ?? "";
const STORJ_SECRET_ACCESS_KEY = process.env.STORJ_SECRET_ACCESS_KEY ?? "";
const STORJ_ENDPOINT = process.env.STORJ_ENDPOINT ?? "";
const STORJ_BUCKET = process.env.STORJ_BUCKET ?? "";

/** S3 key for the metadata index file inside the bucket. */
export const METADATA_INDEX_KEY = "metadata-index.json";

export type MetadataStore = Record<
  string,
  { metadataUri: string; imageUri: string; registeredAt: number }
>;

let _client: S3Client | null = null;

function getS3Client(): S3Client {
  if (_client) return _client;
  if (
    !STORJ_ACCESS_KEY_ID ||
    !STORJ_SECRET_ACCESS_KEY ||
    !STORJ_ENDPOINT ||
    !STORJ_BUCKET
  ) {
    throw new Error("Storj credentials not configured");
  }
  _client = new S3Client({
    endpoint: STORJ_ENDPOINT,
    region: "us1",
    credentials: {
      accessKeyId: STORJ_ACCESS_KEY_ID,
      secretAccessKey: STORJ_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true,
  });
  return _client;
}

/**
 * Read the metadata index from Storj.
 * Returns an empty object if the index doesn't exist yet (first-ever registration).
 */
export async function readMetadataIndex(): Promise<MetadataStore> {
  try {
    const s3 = getS3Client();
    const res = await s3.send(
      new GetObjectCommand({
        Bucket: STORJ_BUCKET,
        Key: METADATA_INDEX_KEY,
      })
    );
    const body = await res.Body?.transformToString("utf-8");
    if (!body) return {};
    return JSON.parse(body) as MetadataStore;
  } catch (err: any) {
    // NoSuchKey / NotFound is expected on first run — return empty store.
    if (err?.$metadata?.httpStatusCode === 404 || err?.name === "NoSuchKey") {
      return {};
    }
    // Unknown S3/network error — bubble up so the route can return 500.
    throw err;
  }
}

/**
 * Overwrite the metadata index in Storj with the provided store.
 */
export async function writeMetadataIndex(store: MetadataStore): Promise<void> {
  const s3 = getS3Client();
  await s3.send(
    new PutObjectCommand({
      Bucket: STORJ_BUCKET,
      Key: METADATA_INDEX_KEY,
      Body: JSON.stringify(store, null, 2),
      ContentType: "application/json",
    })
  );
}