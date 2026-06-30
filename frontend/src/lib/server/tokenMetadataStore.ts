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
import bundledTokenMetadata from "@/data/token-metadata.json";

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
 * Type guard for the AWS SDK "object not found" error.
 * The SDK throws a ServiceException whose shape depends on the underlying
 * transport; both `$metadata.httpStatusCode === 404` and `name === "NoSuchKey"`
 * are valid signals across the major SDK versions.
 */
function isNotFoundError(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const e = err as { $metadata?: { httpStatusCode?: number }; name?: string };
  return e.$metadata?.httpStatusCode === 404 || e.name === "NoSuchKey";
}

/**
 * The bundled token-metadata.json (committed to the repo) acts as a permanent
 * fallback so that founder/legacy tokens always resolve even when the Storj
 * metadata-index.json is missing, empty, or unreachable.
 *
 * Read order:
 *  1. Start with bundled JSON as the base (all known tokens covered).
 *  2. Fetch Storj index and merge on top — Storj entries win so live data
 *     always overrides the static fallback.
 *  3. On any Storj error (missing creds, network failure, missing key) the
 *     bundled data is returned as-is so images keep working instead of 503-ing.
 */
export async function readMetadataIndex(): Promise<MetadataStore> {
  // Cast the imported JSON to MetadataStore — structure is identical.
  const fallback = bundledTokenMetadata as MetadataStore;

  try {
    const s3 = getS3Client();
    const res = await s3.send(
      new GetObjectCommand({
        Bucket: STORJ_BUCKET,
        Key: METADATA_INDEX_KEY,
      })
    );
    const body = await res.Body?.transformToString("utf-8");
    if (!body) return { ...fallback };
    const storjIndex = JSON.parse(body) as MetadataStore;
    // Storj entries win over bundled for any overlapping address.
    return { ...fallback, ...storjIndex };
  } catch (err) {
    // NoSuchKey / NotFound — index hasn't been seeded yet; bundled data covers us.
    if (isNotFoundError(err)) {
      return { ...fallback };
    }
    // Credentials missing or network/S3 error — degrade gracefully to bundled
    // data rather than surfacing a 503 for every token image.
    console.error("[tokenMetadataStore] Storj read failed, using bundled fallback:", err);
    return { ...fallback };
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