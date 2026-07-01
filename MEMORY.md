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

## Git History
- Commit `69c4093` — Changes 1, 2, 3, 5
- Commit `7fd052c` — Change 4
- (Pending) Commit — Changes 6, 7, 8
- Commit `bce6dd9` — Change 9
