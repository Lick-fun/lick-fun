/**
 * Lickfun.xyz Reputation Engine — Daily Root-Hash Anchor
 *
 * Computes a Merkle root of all (profileAddress → reputationScore + tier + activeBadges)
 * pairs and prepares calldata for the Anchor contract (Stage 6).
 *
 * For now: computes the hash and logs it. The on-chain anchor contract
 * will be deployed in Stage 6; this module produces the calldata it will need.
 *
 * NOTE: Uses SHA-256 for now. Swap to keccak256 (EVM-compatible) before
 * Stage 6 anchor deployment.
 */

import { createHash } from "node:crypto";
import type { MerkleLeaf, MerkleAnchor, ProfileScore } from "./types";

/* ═══════════════════════════════════════════════════════════════════════════════ */
/* Hashing                                                                       */
/* ═══════════════════════════════════════════════════════════════════════════════ */

/**
 * Hash a single leaf value.
 * Leaf = keccak256(abi.encodePacked(address, reputation, tierIndex, badgeBitmap))
 * For now, uses SHA-256. Swap to keccak256 for EVM compatibility in Stage 6.
 */
function hashLeaf(leaf: MerkleLeaf): Buffer {
  const hash = createHash("sha256");

  // Encode address (20 bytes hex, stripped of 0x)
  const addr = leaf.address.toLowerCase().replace(/^0x/, "");
  hash.update(addr, "hex");

  // Encode reputation as uint16 (2 bytes, big-endian)
  const rep = Math.round(leaf.reputation);
  const repBuf = Buffer.alloc(2);
  repBuf.writeUInt16BE(rep, 0);
  hash.update(repBuf);

  // Encode tier as uint8 (0=Starter, 1=Established, 2=Verified)
  const tierMap: Record<string, number> = {
    Starter: 0,
    Established: 1,
    Verified: 2,
  };
  const tierByte = Buffer.alloc(1);
  tierByte.writeUInt8(tierMap[leaf.tier] ?? 0, 0);
  hash.update(tierByte);

  // Encode badges as a compact bitmap (11 badges = 11 bits, 2 bytes)
  const badgeBitmap = encodeBadgeBitmap(leaf.activeBadges);
  const badgeBuf = Buffer.alloc(2);
  badgeBuf.writeUInt16BE(badgeBitmap, 0);
  hash.update(badgeBuf);

  return hash.digest();
}

/**
 * Encode badges into an 11-bit bitmap.
 * Badge order (bit 0 = LSB):
 *   bit 0:  First Token
 *   bit 1:  First Graduation
 *   bit 2:  Triple Graduate
 *   bit 3:  Deca Graduate
 *   bit 4:  Crowd Favourite
 *   bit 5:  Diamond Hands
 *   bit 6:  Never Rug
 *   bit 7:  Pre-buy Honest
 *   bit 8:  Volume Maker
 *   bit 9:  Verified Founder
 *   bit 10: OG
 */
function encodeBadgeBitmap(badges: readonly string[]): number {
  const BADGE_ORDER: Record<string, number> = {
    "First Token": 0,
    "First Graduation": 1,
    "Triple Graduate": 2,
    "Deca Graduate": 3,
    "Crowd Favourite": 4,
    "Diamond Hands": 5,
    "Never Rug": 6,
    "Pre-buy Honest": 7,
    "Volume Maker": 8,
    "Verified Founder": 9,
    "OG": 10,
  };

  let bitmap = 0;
  for (const badge of badges) {
    const bit = BADGE_ORDER[badge];
    if (bit !== undefined) {
      bitmap |= 1 << bit;
    }
  }
  return bitmap;
}

/**
 * Hash two child nodes together (Merkle internal node).
 */
function hashPair(left: Buffer, right: Buffer): Buffer {
  const hash = createHash("sha256");
  // Sort to ensure deterministic ordering
  if (Buffer.compare(left, right) <= 0) {
    hash.update(left);
    hash.update(right);
  } else {
    hash.update(right);
    hash.update(left);
  }
  return hash.digest();
}

/* ═══════════════════════════════════════════════════════════════════════════════ */
/* Merkle Tree                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════════ */

/**
 * Build a Merkle tree from sorted leaves.
 * Returns the root hash as a hex string.
 */
function buildMerkleRoot(leaves: MerkleLeaf[]): string {
  if (leaves.length === 0) {
    return "0x" + "00".repeat(32);
  }

  // Hash all leaves
  let layer: Buffer[] = leaves.map((leaf) => hashLeaf(leaf));

  // Build tree bottom-up
  while (layer.length > 1) {
    const nextLayer: Buffer[] = [];
    for (let i = 0; i < layer.length; i += 2) {
      if (i + 1 < layer.length) {
        nextLayer.push(hashPair(layer[i], layer[i + 1]));
      } else {
        // Odd number of nodes: promote the last one
        nextLayer.push(layer[i]);
      }
    }
    layer = nextLayer;
  }

  return "0x" + layer[0].toString("hex");
}

/* ═══════════════════════════════════════════════════════════════════════════════ */
/* Calldata encoding                                                             */
/* ═══════════════════════════════════════════════════════════════════════════════ */

/**
 * Encode calldata for an anchor(bytes32 root, uint256 profileCount) call.
 * Format: 4-byte selector + 32-byte root + 32-byte profileCount
 *
 * selector = keccak256("anchor(bytes32,uint256)")[:4]
 * For now, use a placeholder selector. The actual selector will be known
 * when the Anchor contract is compiled in Stage 6.
 */
function encodeAnchorCalldata(root: string, profileCount: number): string {
  // Placeholder function selector for anchor(bytes32,uint256)
  // Will be replaced with actual keccak256 hash of the function signature in Stage 6
  const SELECTOR = "0x00000000"; // TODO: replace with real selector in Stage 6

  // Strip 0x from root
  const rootHex = root.replace(/^0x/, "");

  // Encode profileCount as uint256 (32 bytes, zero-padded)
  const countHex = profileCount.toString(16).padStart(64, "0");

  return SELECTOR + rootHex + countHex;
}

/* ═══════════════════════════════════════════════════════════════════════════════ */
/* Public API                                                                    */
/* ═══════════════════════════════════════════════════════════════════════════════ */

/**
 * Compute the Merkle anchor from a set of profile scores.
 *
 * Leaves are sorted by address for deterministic ordering.
 * Only profiles with a score are included in the tree.
 */
export function computeAnchor(scores: ProfileScore[]): MerkleAnchor {
  // Sort profiles by address for deterministic ordering
  const sorted = [...scores].sort((a, b) =>
    a.address.toLowerCase().localeCompare(b.address.toLowerCase())
  );

  // Build Merkle leaves
  const leaves: MerkleLeaf[] = sorted.map((s) => ({
    address: s.address,
    reputation: s.reputation,
    tier: s.tier,
    activeBadges: s.badges,
  }));

  const root = buildMerkleRoot(leaves);
  const timestamp = Math.floor(Date.now() / 1000);
  const calldata = encodeAnchorCalldata(root, leaves.length);

  return {
    root,
    profileCount: leaves.length,
    timestamp,
    calldata,
  };
}

/**
 * Log the anchor for daily root-hash anchoring.
 * This is what will be called by the daily cron job.
 */
export function logAnchor(scores: ProfileScore[]): MerkleAnchor {
  const anchor = computeAnchor(scores);

  console.log("═══════════════════════════════════════════════════════");
  console.log("  Lickfun.xyz — Daily Reputation Anchor");
  console.log("═══════════════════════════════════════════════════════");
  console.log(`  Timestamp:     ${new Date(anchor.timestamp * 1000).toISOString()}`);
  console.log(`  Profile Count: ${anchor.profileCount}`);
  console.log(`  Merkle Root:   ${anchor.root}`);
  console.log(`  Calldata:      ${anchor.calldata}`);
  console.log("═══════════════════════════════════════════════════════");

  return anchor;
}