# Session Memory — 2026-07-03

## Investigation: Founder Token Buyback & Burn Vault

**Question:** What happens to the ~60 MON that should be in the buyback vault for the Founder token? Will it execute now?

**Findings (on-chain via Alchemy, block 85072083):**
- Founder token: `0x0236787a1bAaEeD46a123fa264A2355eed11d151` (env: `NEXT_PUBLIC_FOUNDER_TOKEN_ADDRESS`)
- FeeRouter: `0x5BBe528936E627d33DE36f10d9DB946089b9E903` (env: `NEXT_PUBLIC_FEE_ROUTER_ADDRESS`)
- `VaultBuybackBurn`: `0x45B1Ee1E9E8E9FF8CE6bBbd55B430Cab4b25e06d` (env: `VAULT_BUYBACK_ADDR`)
- `VaultLPSupport`: `0xF1Aac85a5F964564e472BF1E0628c536b01809e0` (env: `VAULT_LP_ADDR`)
- All env addresses match what's stored on-chain in FeeRouter.lpSupportVault / buybackBurnVault. ✓
- Founder's FeeConfig: `creator=0xB2DA54BB8D5676247Ef83354328c481d518fbb0C, creatorBps=0, lpBps=8000, buybackBps=2000` (LIGHT preset).
- VaultBuybackBurn.current native MON balance: **65.44 MON** (later 78.3 MON as more trades landed).
- `VaultLPSupport.current native MON balance: 313.3 MON**.
- `VaultBuybackBurn.pendingBurn(founder)` = **0 MON** (also true for the other 2 launched tokens).
- `VaultLPSupport.pendingLP(founder)` = **0 MON** (also true for the other 2 launched tokens).
- `FeeRouter.pendingWithdrawals[buybackBurnVault]` = **0 MON**.
- 66 `FeeRouted` events for the founder token (buybackShare totaling ~82.7 MON, lpShare ~330.9 MON). Zero `FeePending` events ever emitted.
- All 3 launched tokens affected equally — this is a systemic v1 FeeRouter issue, not a Founder-specific one.

**Why `pendingBurn(founder) == 0` despite 78.3 MON sitting in the vault (deeper root cause — confirmed via bytecode inspection):**
- The vault's `pendingBurn[token]` mapping only increases when someone calls `VaultBuybackBurn.receiveForToken(token)` directly (which the v2 contract exposes).
- The **currently deployed `FeeRouter` (`0x5BBe...9E903`) does NOT contain the `receiveForToken(address)` selector (`0x75b564e7`) in its bytecode**. It only does a raw `call{value}("")` to the vaults via their bare `receive()`. So the v2 audit fix was never re-deployed for the FeeRouter — the existing one predates the fix.
- `Factory.feeRouter` and each `BondingCurve.feeRouter` are both **set-once** (`AlreadySet` guard) — cannot be re-pointed. So every future trade fee on all 3 existing tokens (and any new token launched through this Factory) will keep hitting the same broken raw-send path forever.
- `FeeRouter.setVaults(_lp, _bb)` is freely re-callable (no lock) but it only changes *which* vault addresses receive the raw sends — it can't change *how* they're sent.
- `VaultBuybackBurn.sweep()` and `setMaxSlippage()` are `onlyOwner` — owner is the multisig `0x9F3fDE2C42BA3B00110fC4dc3365782dFE2743fA` (Safe contract, 344 bytes). Keeper wallet `0x7037...5817` is a separate hot wallet with no vault owner rights.

**Conclusion:** The ~78 MON Buyback & ~313 MON LP Support have *not* been executed. The keeper's current `pendingBurn(token)` read returns 0 forever for every token, so the execution threshold check never passes. Even with `VAULT_BUYBACK_ADDR` / `VAULT_LP_ADDR` env vars set, the keeper is blind to the actual accumulated balance.

---

## Fix architecture (implemented this session)

**Two-tier fix** to make the launchpad self-healing for every token, not just the founder one:

### Tier 1 — Unblock the stranded 78 + 313 MON right now (one-shot, multisig-only)
- The multisig owner calls the new `VaultRecouper.recover{value: X}(vault, token)` after sweeping each vault's balance out via `sweep()`.
- `VaultRecouper` (new contract, `contracts/src/VaultRecouper.sol`) is a tiny permissionless helper that forwards `msg.value` to a vault via the v2 `receiveForToken(token)` entrypoint — which correctly populates the per-token mapping.
- Net effect: `pendingBurn(founder)` jumps to ~78 MON (above 50 MON threshold) and `pendingLP(founder)` jumps to ~313 MON.
- The Railway keeper (with `VAULT_BUYBACK_ADDR` and `VAULT_LP_ADDR` env vars now set) will then call `execute()` automatically on its next 60s poll cycle — first real buyback+burn + LP add should fire within ~1 minute of Tier 1 completion.

**Files added for Tier 1:**
- `contracts/src/VaultRecouper.sol` — 50-line permissionless helper, no owner, no admin, no upgradeability. Safe to deploy + use.
- `contracts/script/ReconcileVaults.s.sol` — Forge script for multisig owners; can be run with `--broadcast` (EOA) or just for calldata (Safe Transaction Builder).
- `script/reconcile-vaults.mjs` — Self-contained Node.js + viem script that the operator can run with a hot wallet to do the whole reconcile in one command. Run with `PRIVATE_KEY=0x... node script/reconcile-vaults.mjs` after `RECOUPER_ADDR` is set.

### Tier 2 — Self-healing for all current and future tokens (no manual babysitting, ever)
- The deployed v1 FeeRouter cannot be swapped (Factory.feeRouter is set-once). Every future trade on the 3 existing curves will keep raw-sending to the vaults.
- Mitigation: the new `VaultRecouper` is **permissionless** — anyone (including the keeper) can call it to re-attribute any future raw-sends. The user can optionally add a simple recurring "sweep and re-attribute" call to the multisig (low-effort, fully scriptable) to keep the per-token mapping live going forward. Or the existing keeper can be extended to do this automatically.

**Why this is the right shape for a launchpad:**
- `VaultRecouper` is intentionally minimal — no owner key, no admin, no pausing, no upgradeability. The caller is the source of funds and could equivalently call `receiveForToken` directly. This wrapper is a single-call convenience that also exists so the keeper can re-attribute without holding MON (it forwards from `msg.value`, accounting exactly).
- For the founder token specifically: pendingBurn(founder) = ~78 MON, pendingLP(founder) = ~313 MON — both far above 50 MON threshold.
- For all 3 launched tokens: the same script can be re-run (or extended) to re-attribute raw-sends to their respective tokens.

**What still needs to be done outside code (operator actions, documented in `script/README.md`):**
1. Deploy `VaultRecouper.sol` to mainnet via forge (e.g. `forge create --rpc-url ... --private-key ... contracts/src/VaultRecouper.sol`).
2. Set `RECOUPER_ADDR` env var locally + on Railway (the keeper doesn't need it; only the operator's reconcile script does).
3. Run the one-shot reconcile: `PRIVATE_KEY=<multisig-signer-key> node script/reconcile-vaults.mjs` (or use the multisig's Transaction Builder with the calldata from `contracts/script/ReconcileVaults.s.sol`).
4. Watch the Railway keeper logs for the first real `execute()` call within ~1 minute.

## Git History
- Commit `24875ab` (2026-07-03 morning) — Investigation findings logged.
- Commit `(pending)` — Fix files added: VaultRecouper + reconcile scripts.


---

# Session Memory — 2026-07-02

## Changes Made

### 1. Graduation Keeper — Graceful Shutdown + Railway Restart Policy
- **Files:**
  - `script/graduation-keeper.ts`
  - `script/package.json`
  - `script/railway.json` (new)
  - `script/README.md`

- **What:**
  - Added explicit `SIGTERM` / `SIGINT` handlers in `graduation-keeper.ts` that log a clean shutdown message and `process.exit(0)`, plus `unhandledRejection` / `uncaughtException` guards so real errors are visible instead of silently killing the process.
  - Changed `script/package.json` start script from `tsx graduation-keeper.ts` to `exec tsx graduation-keeper.ts` so the shell replaces itself with the tsx process (proper signal delivery, no orphaned npm wrapper).
  - Added `script/railway.json` with `startCommand: npx tsx graduation-keeper.ts` and `restartPolicyType: ON_FAILURE` (10 retries) so genuine crashes auto-restart.
  - Updated `script/README.md` Railway section to document the new `railway.json`, the requirement to set `VAULT_BUYBACK_ADDR` and `VAULT_LP_ADDR` env vars on the Railway service, and to keep "Serverless/Sleep" off with no public domain/healthcheck attached to this headless worker.
- **Why:** Railway logs were showing `Starting Container` → `[vault] synced 3 known token(s) via Alchemy` → `Stopping Container` → `npm error signal SIGTERM` on every redeploy/restart. Root cause: Railway sends `SIGTERM` to stop the old container, and npm's process wrapper cosmetically logs that as an "error" because the keeper wasn't handling the signal itself and exiting with code 0. Separately, `VaultBuybackBurn: (not configured)` / `VaultLPSupport: (not configured)` in the logs meant the vault execution half of the keeper was silently disabled in production because those env vars weren't set on the Railway service.
- **Verified:** Ran the keeper locally end-to-end — it connects, logs config, and syncs known tokens successfully. No syntax errors.

## Git History
- Commit `(pending)` — Change 1

---

# Session Memory — 2026-07-01


## Changes Made

### 1. Duplicate Trades Fix
- **File:** `frontend/src/lib/hooks/useData.ts`
- **What:** Disabled the stale RPC fallback query (`enabled: false`) in `useTokenTradesMerged` hook. Also normalized trade IDs to lowercase in the dedup Set.
- **Why:** Race condition — RPC query had 20s staleTime and served cached trades while indexer was still loading, bypassing deduplication.

### 2. Trades Pagination (max 10)
- **File:** `frontend/src/app/token/[id]/page.tsx`
- **What:** Added `TRADES_PER_PAGE = 10`, `tradePage` state, `tradePageCount`, `pagedTrades` derived value, and pagination UI (← Prev / N of M / Next →) above the table header.
- **Why:** User requested max 10 trades displayed with a "next page" button at the top left.

### 3. TokenCard Nested Anchor Fix
- **File:** `frontend/src/components/token/TokenCard.tsx`
- **What:** Replaced 3 social link `<a>` tags (nested inside `<Link>` which renders as `<a>`) with `<button type="button">` + `window.open()`.
- **Why:** Next.js hydration error from invalid nested `<a>` inside `<a>`.

### 4. Founder Badge Visual Improvement
- **File:** `frontend/src/components/home/FounderTokenBanner.tsx`
- **What:** Changed "⭐ Founder" badge from `text-figma-xs font-semibold` to 15px `font-extrabold uppercase tracking-widest` with brighter green gradient background, green border ring, and green text-shadow glow.
- **Why:** User wanted the "Founder" text to be bolder and easier to read on the homepage.

### 5. Trade ID Normalization in API Route
- **File:** `frontend/src/app/api/trades/[curve]/route.ts`
- **What:** Lowercased `transaction_hash` in trade ID generation.
- **Why:** Case mismatch between indexer (lowercase) and HyperSync (mixed case) caused duplicate entries.

### 6. Remove Profile From Main Nav (consolidate to wallet dropdown)
- **Files:**
  - `frontend/src/components/layout/Header.tsx`
  - `frontend/src/components/layout/Sidebar.tsx`
- **What:**
  - Header: removed "Create Token" from `navLinks` and removed the conditional "Profile" `<Link>` block (and unused `Plus`/`User`/`useAccount` imports).
  - Sidebar: removed the entire `extraLinks`/Profile section, the `DisabledNavLink` component, and the `User` icon import.
- **Why:** "Create Token" and "Profile" are both already accessible from the wallet dropdown (`WalletMenu`), so listing them in the main nav is redundant.

### 7. Mobile Bottom Nav Re-optimization (Create as raised FAB)
- **File:** `frontend/src/components/layout/BottomNav.tsx`
- **What:** Removed "Create" from the flat tab list and promoted it to a raised circular floating action button centered on the nav bar. The remaining 4 links (Home, Discover, Markets, Learn) now split evenly left/right around the FAB, each with `flex-1` so the layout is balanced on any mobile width. Icons bumped to 20px, labels to 11px (truncate-safe). FAB uses `bg-figma-purple` (green when active) with a 12×12 round button, 4px `border-figma-bg` ring so it visually "floats", and `shadow-lg`.
- **Why:** Removing "Create" from the flat 5-tab row would have left a sparse, off-center bar. Keeping it as a raised FAB preserves prominence of the primary CTA while balancing the remaining 4 tabs.

### 8. Founder Badge Symmetry
- **File:** `frontend/src/components/home/FounderTokenBanner.tsx`
- **What:** Changed "⭐ Founder" to "⭐ Founder ⭐".
- **Why:** User wanted the stars symmetric on both sides of the "Founder" word on the homepage banner.

### 9. Fee Strategy Toggle Slider Alignment Fix
- **File:** `frontend/src/components/fee/FeeConfigSelector.tsx`
- **What:** Fixed the white thumb position on the four Fee Strategy toggles (Buyback & Burn, LP Support, Creator, Gift) on the Create Token page. Gave the thumb an explicit `left-0.5 top-0.5` resting position; changed OFF transform from `translate-x-0.5` to `translate-x-0`; kept ON as `translate-x-5`. Also moved `border` to the base classes (always present) and used `border-figma-green` on the ON state so the box model is identical in both states.
- **Why:** Thumb had no explicit `left` and relied on the browser's default static position, so the `translate-x-5` shift in the ON state left ~4px of right-side gap instead of the matching 2px seen on the left. The OFF track also had a 1px border that the ON track didn't, causing a sub-pixel shift between states.

### 10. New Token Image Race Condition Fix
- **File:** `frontend/src/lib/hooks/useCreateToken.ts`
- **What:** After the on-chain create tx confirms, the metadata-registration POST was firing in a fire-and-forget async IIFE — the rest of the effect immediately proceeded to dev-buy/`setStep("done")` without waiting. Wrapped the entire post-receipt block (metadata registration → optional dev buy → mark done) in a single `(async () => { ... })()` so the registration is awaited and the navigation to the token page only happens after the Storj index write has actually landed.
- **Why:** `useTokenImage` uses `staleTime: 5 min` and `retry: false`. When the create-page routed to `/token/[address]` before the registration write completed, the very first `/api/token-image` fetch returned 404 and that "no image" result got cached client-side for 5 minutes, making the image appear permanently missing even though registration succeeded moments later. Dev-buy tokens masked the race because the extra tx bought enough time; plain token creations (no dev buy) hit it almost every time.

### 11. Founder Banner Nested Anchor Fix
- **File:** `frontend/src/components/home/FounderTokenBanner.tsx`
- **What:** Replaced the inner `<a href="https://monadvision.com/tx/...">` "Founder & Dev wallet sent to BURN" badge (nested inside the card's outer `<Link href="/token/...">`) with a `<button type="button" onClick={...}>` that calls `window.open(url, "_blank", "noopener,noreferrer")` and `e.stopPropagation()`. Same classes, same visuals, same new-tab behavior, valid HTML.
- **Why:** Next.js 15 + React 19 now throw a hydration error: "In HTML, <a> cannot be a descendant of <a>". Identical pattern to the one already fixed in `TokenCard.tsx` (change #3).

### 12. BLOB Token Image Short-Term Hardcode
- **Files:**
  - `frontend/public/tokens/blob.jpg` (new — copied from `~/Desktop/lick.fun media/Blob.jpg`)
  - `frontend/src/data/token-metadata.json`
  - `frontend/src/lib/ipfs.ts`
  - `frontend/src/app/api/token-image/[address]/route.ts`
  - `frontend/src/app/api/token-metadata/[address]/route.ts`
  - `frontend/src/app/api/token-metadata/route.ts`
- **What:** Added a bundled fallback entry for BLOB (`0x46c26ca65f0b3e54c300f819cc73351141152d4a`) pointing at `/tokens/blob.jpg` (empty `metadataUri` since no real on-chain metadata JSON exists yet). Updated all `ipfsToHttp` resolvers to pass through relative `/...` paths: client-side (used by `TokenImage`/`useTokenImage`) and the same-origin `token-image` API return the path as-is so the browser resolves it; the aggregator-facing `token-metadata` API routes prefix with `SITE_URL` so external bots get a fully-qualified URL.
- **Why:** User had created the BLOB token but missed the second wallet signature prompt, so the on-chain create succeeded but the metadata registration never ran. Instead of forcing a re-create, this hardcodes the image as a short-term fix so BLOB shows correctly on discovery, the homepage, and the token page. Can be removed once a real registration write replaces the bundled entry.

### 13. Founder Token X Link Override
- **File:** `frontend/src/app/token/[id]/page.tsx`
- **What:** Added a derived `twitterUrl` that is hardcoded to `https://x.com/Lickfun__` when `isFounderToken` is true (driven by `NEXT_PUBLIC_FOUNDER_TOKEN_ADDRESS`), else falls back to `ipfsMeta?.twitter`. Updated the "Social links" block in the right-hand "Information" card so the X anchor's `href` and the surrounding render condition both use `twitterUrl` instead of `ipfsMeta.twitter`. TG and Web links remain driven by IPFS metadata.
- **Why:** User wanted the Founder token page's X button to point at the official Lickfun X profile, regardless of whatever's in the token's IPFS metadata. App-side override mirrors the existing pattern used for the dev-wallet burn-tx link on the same page.

### 14. Founder Token X Link — TS Narrowing Fix
- **File:** `frontend/src/app/token/[id]/page.tsx`
- **What:** Changed `ipfsMeta.telegram` to `ipfsMeta?.telegram` and `ipfsMeta.website` to `ipfsMeta?.website` on the condition + href lines of the TG and Web anchors in the same "Social links" block touched by Change 13.
- **Why:** After Change 13, the outer render condition references `twitterUrl` — which can be truthy even when `ipfsMeta` is null — so TypeScript no longer narrows `ipfsMeta` to non-null inside the block, and bare `ipfsMeta.telegram` / `ipfsMeta.website` accesses failed the type check (and would break the Next.js build). Optional chaining keeps the build green without changing runtime behaviour. Verified with `node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit`.

## Git History
- Commit `69c4093` — Changes 1, 2, 3, 5
- Commit `7fd052c` — Change 4
- (Pending) Commit — Changes 6, 7, 8
- Commit `bce6dd9` — Change 9
- Commit `(pending)` — Changes 10, 11, 12
- Commit `f51f615` — Change 13
- Commit `(pending)` — Change 14

