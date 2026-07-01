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

