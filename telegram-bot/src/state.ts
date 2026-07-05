/**
 * Lickfun Telegram Bot — State
 * - Persists the last-seen trade cursor to disk so restarts don't re-alert old trades.
 * - Tracks pending verification timers in memory.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CURSOR_FILE = join(__dirname, "..", ".cursor.json");

interface CursorData {
  /** blockTimestamp (unix seconds, as string) of the most recent processed trade */
  lastTimestamp: string;
  /** set of processed trade ids near the cursor boundary to avoid duplicates */
  seenIds: string[];
}

let cursor: CursorData = { lastTimestamp: "0", seenIds: [] };

export function loadCursor(): CursorData {
  try {
    if (existsSync(CURSOR_FILE)) {
      const raw = readFileSync(CURSOR_FILE, "utf-8");
      cursor = JSON.parse(raw) as CursorData;
    }
  } catch (err) {
    console.error("[state] Failed to load cursor, starting fresh:", err);
    cursor = { lastTimestamp: "0", seenIds: [] };
  }
  return cursor;
}

export function getCursor(): CursorData {
  return cursor;
}

export function saveCursor(next: CursorData): void {
  cursor = next;
  try {
    writeFileSync(CURSOR_FILE, JSON.stringify(cursor), "utf-8");
  } catch (err) {
    console.error("[state] Failed to save cursor:", err);
  }
}

/**
 * Mark a trade id as seen and advance the cursor timestamp.
 * Keeps only the most recent ~200 ids to bound memory/disk.
 */
export function markProcessed(tradeId: string, blockTimestamp: string): void {
  const seen = new Set(cursor.seenIds);
  seen.add(tradeId);
  const seenIds = Array.from(seen).slice(-200);
  const lastTimestamp =
    BigInt(blockTimestamp) > BigInt(cursor.lastTimestamp)
      ? blockTimestamp
      : cursor.lastTimestamp;
  saveCursor({ lastTimestamp, seenIds });
}

export function hasProcessed(tradeId: string): boolean {
  return cursor.seenIds.includes(tradeId);
}

/* ─── Pending verification timers ────────────────────────────────────────────── */

export interface PendingVerification {
  userId: number;
  chatId: number;
  messageId: number; // the verification prompt message to delete later
  timeout: NodeJS.Timeout;
}

const pending = new Map<string, PendingVerification>();

function key(chatId: number, userId: number): string {
  return `${chatId}:${userId}`;
}

export function addPending(v: PendingVerification): void {
  pending.set(key(v.chatId, v.userId), v);
}

export function getPending(
  chatId: number,
  userId: number,
): PendingVerification | undefined {
  return pending.get(key(chatId, userId));
}

export function removePending(chatId: number, userId: number): void {
  const k = key(chatId, userId);
  const v = pending.get(k);
  if (v) clearTimeout(v.timeout);
  pending.delete(k);
}
