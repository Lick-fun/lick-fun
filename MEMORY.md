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

## Git History
- Commit `69c4093` — Changes 1, 2, 3, 5
- Commit `7fd052c` — Change 4
- Both pushed to `origin main`
