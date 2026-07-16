/**
 * Storj-backed profile metadata store.
 *
 * Persists a single JSON object (walletAddress → { displayName, avatarUri,
 * xUrl, websiteUrl, telegramUrl, updatedAt }) inside the configured Storj S3
 * bucket. Mirrors the pattern already used for token metadata
 * (`tokenMetadataStore.ts`) — Railway containers have an ephemeral
 * filesystem, so anything written to local disk (the previous approach,
 * `src/data/profile-metadata.json`) is silently reset to whatever's in the
 * last git commit on every redeploy. Storj survives redeploys.
 *
 * The actual avatar image files are already on Storj via /api/upload-profile.
 * This module only owns the small lookup index of profile metadata fields.
 *
 * Concurrency:
 *   - Each GET/PUT is a full-object read or full-object write. There is no
 *     in-memory cache; concurrent registrations may overwrite each other
 *     (last writer wins), which is acceptable since each (walletAddress) key
 *     is only written by its own owner (enforced via wallet signature in the
 *     register-profile route).
 */

import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import bundledProfileMetadata from "@/data/profile-metadata.json";

const STORJ_ACCESS_KEY_ID = process.env.STORJ_ACCESS_KEY_ID ?? "";
const STORJ_SECRET_ACCESS_KEY = process.env.STORJ_SECRET_ACCESS_KEY ?? "";
const STORJ_ENDPOINT = process.env.STORJ_ENDPOINT ?? "";
const STORJ_BUCKET = process.env.STORJ_BUCKET ?? "";

/** S3 key for the profile metadata index file inside the bucket. */
export const PROFILE_INDEX_KEY = "profile-index.json";

export type ProfileEntry = {
  displayName: string;
  avatarUri: string;
  xUrl: string;
  websiteUrl: string;
  telegramUrl: string;
  updatedAt: number;
};
export type ProfileStore = Record<string, ProfileEntry>;

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
 * The bundled profile-metadata.json (committed to the repo) acts as a
 * one-time seed / permanent fallback so profiles registered before this
 * migration keep working even if the Storj profile-index.json is missing,
 * empty, or unreachable.
 *
 * Read order:
 *  1. Start with bundled JSON as the base (covers pre-migration profiles).
 *  2. Fetch Storj index and merge on top — Storj entries win so live data
 *     always overrides the static fallback.
 *  3. On any Storj error (missing creds, network failure, missing key) the
 *     bundled data is returned as-is so profiles keep working instead of
 *     disappearing.
 */
export async function readProfileIndex(): Promise<ProfileStore> {
  // Older bundled entries may be missing newer optional fields (xUrl,
  // telegramUrl) — cast through `unknown` since the shape only partially
  // overlaps with ProfileEntry.
  const fallback = bundledProfileMetadata as unknown as ProfileStore;

  try {
    const s3 = getS3Client();
    const res = await s3.send(
      new GetObjectCommand({
        Bucket: STORJ_BUCKET,
        Key: PROFILE_INDEX_KEY,
      })
    );
    const body = await res.Body?.transformToString("utf-8");
    if (!body) return { ...fallback };
    const storjIndex = JSON.parse(body) as ProfileStore;
    // Storj entries win over bundled for any overlapping address.
    return { ...fallback, ...storjIndex };
  } catch (err) {
    // NoSuchKey / NotFound — index hasn't been seeded yet; bundled data covers us.
    if (isNotFoundError(err)) {
      return { ...fallback };
    }
    // Credentials missing or network/S3 error — degrade gracefully to bundled
    // data rather than surfacing a 500 for every profile lookup.
    console.error("[profileMetadataStore] Storj read failed, using bundled fallback:", err);
    return { ...fallback };
  }
}

/**
 * Overwrite the profile metadata index in Storj with the provided store.
 */
export async function writeProfileIndex(store: ProfileStore): Promise<void> {
  const s3 = getS3Client();
  await s3.send(
    new PutObjectCommand({
      Bucket: STORJ_BUCKET,
      Key: PROFILE_INDEX_KEY,
      Body: JSON.stringify(store, null, 2),
      ContentType: "application/json",
    })
  );
}
