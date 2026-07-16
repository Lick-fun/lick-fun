# Session Memory — 2026-07-16 (newest) — Railway build fix: regenerated root pnpm-lock.yaml

## Task: Fix Railway build failure on the freshly-merged UI overhaul commit.

User merged PR #1 (`Full UI overhaul`) into `main`, Railway auto-deploy attempted but
the build failed. Diagnosis arrived: root `pnpm-lock.yaml` was out of sync with
`frontend/package.json` — missing `@sentry/nextjs` and other deps. The stray
`frontend/pnpm-lock.yaml` (dated 2026-07-13, leftover from pre-monorepo era) was
masking the sync issue and pnpm was reporting "Already up to date" when it shouldn't
have.

### Fix applied (commit `333d88a`, pushed to `main`)
1. Deleted the stray `frontend/pnpm-lock.yaml` — pnpm workspaces should have a single
   authoritative lockfile at the repo root.
2. Regenerated root `pnpm-lock.yaml` by moving it aside and re-running `pnpm install`.
   This was the only way to force true re-resolution; pnpm was refusing to do so while
   the stray lockfile existed.
3. Verified with Railway's exact command locally: `pnpm install --frozen-lockfile`
   succeeds, `pnpm build` succeeds (all 16 routes generated, no errors).
4. Recorded the full lesson in `repo/security-notes.md` for future sessions.

### Lesson (also documented in `.memory/2026-07-16 — Railway build failure (stale root pnpm-lock.yaml).txt`)
If `pnpm install --frozen-lockfile` ever reports a sync error after a dependency
change, check for a stray workspace-package `pnpm-lock.yaml`. pnpm workspaces should
have a single authoritative lockfile at the repo root only. Do not trust pnpm to
flag a stale lockfile when both root + per-package copies coexist — it will report
"Already up to date" silently. Only deleting the stale lockfile + re-running install
forces true regeneration.

### Other doc updates this session
- `README.md` status line + build pipeline row updated for both the UI overhaul AND
  the lockfile fix.
- New tracked session note: `.memory/2026-07-16 — Full UI Overhaul (v0 Figma redesign merge).txt`
- New tracked session note: `.memory/2026-07-16 — Railway build failure (stale root pnpm-lock.yaml).txt`
- `frontend/UI_MIGRATION_PLAN.md` committed with full file-by-file merge rationale
  (kept in repo as a durable reference, not just chat/session memory).

---

# Session Memory — 2026-07-16 — Full UI overhaul: v0 Figma redesign selectively merged into frontend

## Task: Replace the entire frontend UI with a v0-generated Figma redesign, keeping production infra intact.

User provided a local export from v0 (a full fork of `frontend/`, purple/lime "degen" theme, Figma file `CU3oZmvNUl8b722gjtQvNa`) and asked to completely replace the current UI. Decision: **selective merge**, not a folder swap — diff every file first, take the design, reject any regressions in server/data logic.

### Process
1. Diffed every file between the v0 export and current `frontend/src` (hash + line-level) before copying anything — treated the whole export as untrusted, not just "new components".
2. Copied from v0: all `components/**`, redesigned pages (`create/discover/markets/how-it-works/profile/token`), `tailwind.config.ts`, `globals.css`, `lib/{format,utils,ipfs}.ts`, `lib/mock/*`, `lib/hooks/*` (added a safe `MOCK_MODE` fallback, gated on missing `NEXT_PUBLIC_ENVIO_GRAPHQL_URL` — no-op in prod).
3. **Rejected two regressions found in the v0 export** (see `frontend/UI_MIGRATION_PLAN.md` for full detail):
   - `lib/wagmi/config.ts` — v0 replaced the throw-on-missing `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` with a silent placeholder id. Kept current (throw).
   - `app/api/register-profile/route.ts` — v0 reverted the 2026-07-13 Storj migration back to local-disk `fs` writes, which would silently wipe all profile data on every Railway redeploy (ephemeral filesystem). Kept current entirely (all 4 upload/metadata API routes, in fact — only `register-profile` had diverged from v0; the other 3 were byte-identical).
   - v0's `next.config.ts`/`package.json` had dropped `@sentry/nextjs` + `withSentryConfig` — kept current.
   - v0's `app/layout.tsx` had dropped `<Analytics />` and `<Footer />` — manually re-added both after copying v0's layout structure.
4. Kept current `src/data/profile-metadata.json` / `token-metadata.json` (verified byte-identical real production data in v0's copy anyway — current is the source of truth).
5. `tsconfig.json` — took v0's one additive change (`.next/dev/types/**/*.ts` in `include`).

### Verification
- `pnpm build` — clean, zero new TypeScript errors, all 16 routes generated (incl. `/privacy`, `/terms`, all API routes).
- `pnpm dev` smoke test via browser — Home, Discover, Token detail, Create, Profile all render correctly with **live Envio indexer data** (real tokens, real MON balances, real bonding-curve %), not mock data. Footer + Analytics confirmed present in the DOM on every page.
- Caught and reverted accidental `pnpm-lock.yaml` drift (1574 lines) from an early `pnpm install`/`pnpm dev` run that resolved newer transitive deps than committed — reinstalled with `--frozen-lockfile` to match the Railway build exactly.
- `pnpm-workspace.yaml` gained one legitimate line (`allowBuilds: '@sentry/cli': true`) — needed locally because newer pnpm blocks postinstall scripts by default; harmless, matches existing `allowBuilds` pattern for `bufferutil`/`esbuild`/`keccak`.
- Full plan + rationale written to `frontend/UI_MIGRATION_PLAN.md` (kept in repo as a durable reference, not just chat/session memory).

### Outstanding for user (not blocking)
- Restyle `/privacy` and `/terms` to the new theme (currently functional, inherits base styles only)
- Manual QA on wallet-connected flows (buy/sell tx, create token tx, edit-profile save) — not exercised by the automated smoke test (needs a real signature)
- Verify `NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS` is set correctly — `/markets` showed a perpetual loading state in local dev (looked like an env issue unrelated to the merge)
- Two `<img>` → `next/image` ESLint warnings for LCP (pre-existing pattern in v0's copied components)

---

# Session Memory — 2026-07-13 — Marketing-readiness hardening: profile persistence, vault alerting, observability, terms

## Task: Pre-marketing audit — fix the highest-impact items, document, and prep for commit.

User asked: "we are ramping up marketing now... tell me what needs to be improved/updated/upgraded to paid service first... make the plan to start from the most critical... Do all. i will have the terms page reviewed by legal after... make sure .memory is current and readme. the commit and push changes."

### Items fixed (all verified against live code; full production build succeeded)

**1. Profile metadata persistence — Storj-backed (was local-disk, wiped on every Railway redeploy)**
- Confirmed live: `frontend/src/app/api/register-profile/route.ts`, `frontend/src/app/api/profile-image/[address]/route.ts`, and `frontend/src/app/profile/[address]/layout.tsx` were all writing to / reading from `src/data/profile-metadata.json` on local disk. Railway's ephemeral filesystem meant the next `git push` would silently reset this file to whatever was in HEAD — wiping every user's display name, avatar, and social links.
- Fixed by mirroring the existing pattern from `frontend/src/lib/server/tokenMetadataStore.ts`: new `frontend/src/lib/server/profileMetadataStore.ts` (readProfileIndex/writeProfileIndex), with bundled `src/data/profile-metadata.json` as permanent fallback (merged, Storj wins on conflicts — no manual migration step needed for the 2 existing profiles).
- Migrated all 3 consumers to use the new store.
- Verified `tsc --noEmit` clean and `next lint` zero new warnings.

**2. Vault untracked-balance monitoring — Telegram alerts in the keeper (recurring reconciliation risk)**
- Confirmed live: live `FeeRouter` predates the `receiveForToken()` audit fix and can never be replaced (`Factory.feeRouter` is set-once). Every trade fee silently accumulates "untracked" in the vaults, requiring periodic manual Safe multisig batches to unstuck (2nd batch just executed 2026-07-09, see earlier session below).
- Deliberately did NOT give the keeper `sweep()` rights — that's `onlyOwner` (multisig-only) by design, an audit hardening decision. Instead added **read-only monitoring**:
  - New `checkUntrackedVaultBalance()` in `script/graduation-keeper.ts` — runs alongside `pollVaults()` every `VAULT_POLL_MS` cycle. Compares `vault.balance()` vs sum of `pendingBurn`/`pendingLP` across all known tokens. The diff is untracked MON.
  - Fires a Telegram message via bot API when untracked MON >= `UNTRACKED_ALERT_THRESHOLD_MON` (default 30, below the 50 MON execute() cutoff for lead time). Re-alerts only after growing by `UNTRACKED_ALERT_STEP_MON` (default 20) more, to avoid spam.
  - Anti-spam: tracks `lastUntrackedAlerted` per vault, resets when untracked drops below threshold.
  - Both `ALERT_TELEGRAM_BOT_TOKEN` and `ALERT_TELEGRAM_CHAT_ID` are optional env vars — feature is a no-op without them.
- Verified via esbuild syntax check (did NOT execute the live script — running it would fire real txs/reads against mainnet with the live keeper wallet).
- Documented in `script/.env.example`.

**3. Sentry error monitoring — opt-in, env-gated, no behavior change without DSN**
- Added `@sentry/nextjs` v10.65.0 (dependency: frontend/package.json).
- Files: `frontend/src/instrumentation-client.ts` (browser), `frontend/src/sentry.server.config.ts` + `frontend/src/sentry.edge.config.ts` (server/edge), `frontend/src/instrumentation.ts` (Next.js hook registering server/edge configs + `onRequestError`), `frontend/src/app/global-error.tsx` (root error boundary).
- `frontend/next.config.ts` wrapped with `withSentryConfig` — source-map upload only active if `SENTRY_ORG`/`SENTRY_PROJECT`/`SENTRY_AUTH_TOKEN` set in build env, silent no-op otherwise. Uses `webpack.treeshake.removeDebugLogging: true` to drop debug code from production bundle.
- ALL Sentry.init() calls gated on `NEXT_PUBLIC_SENTRY_DSN` (or `SENTRY_DSN` server-side) — completely no-op if unset. Wallet-rejection errors filtered out (`ignoreErrors`) to avoid noise.
- Verified full `next build` succeeds with or without DSN configured. Sentry webpack plugin runs cleanly.

**4. Plausible analytics — opt-in, cookie-less, privacy-friendly**
- New `frontend/src/components/layout/Analytics.tsx` — rendered in root layout. No-op unless `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` set. Supports self-hosted via `NEXT_PUBLIC_PLAUSIBLE_SCRIPT_URL`. No cookie-consent banner needed (Plausible doesn't use cookies or collect PII per their data policy).

**5. Terms of Service & Privacy Policy pages**
- New `frontend/src/app/terms/page.tsx` and `frontend/src/app/privacy/page.tsx` — both static, SEO metadata (title/description/canonical/robots), pre-rendered in `next build`. Both clearly marked in-page as "⚠️ DRAFT — pending legal review" (user said legal would review after).
- New `frontend/src/components/layout/Footer.tsx` — added to root layout, renders on every page with links to /terms and /privacy plus copyright.
- Also added matching Terms/Privacy links to the (currently unused) `frontend/src/components/layout/Sidebar.tsx` footer for consistency.

**6. Documentation refresh — README + .memory**
- README.md fully updated for Phase 4: tests badge (136→176), status line, mainnet deployment table (V2 vault addresses, VaultRecouper, Treasury Safe), project structure (15 contracts / 11 pages / 17 test files), contract architecture (V2 vault + Recouper entries), API security + new Observability subsection, build pipeline (all Phase 4 rows added, Phase 5 pending updated), test count claims updated.
- this MEMORY.md file updated (this entry).
- `.memory/Lick.fun — Deployment & Addresses.txt` (Cline RAG file) — INTENTIONALLY LEFT UNTOUCHED because it's covered by `.memory/` in `.gitignore` (only `2026-*.txt` files are tracked). The file is outdated (still references testnet/Phase 3) but updating it is a Cline-context concern, not a git commit concern. A future commit could force-add it if desired.

### Verification performed
- `tsc --noEmit` clean after each change set
- `next lint` — only pre-existing warnings (no new ones)
- Full `next build` — succeeded; `/terms` and `/privacy` statically prerendered (349 B and 368 B respectively); Sentry webpack plugin runs without error with no DSN configured
- esbuild syntax check on the modified `graduation-keeper.ts` (did NOT execute the live script — would have fired real txs against mainnet)

### Outstanding for user (not blocking the commit)
- Sign up at sentry.io (free tier is fine) → set `NEXT_PUBLIC_SENTRY_DSN` in Railway frontend env
- Sign up at plausible.io → set `NEXT_PUBLIC_PLAUSIBLE_DOMAIN=lickfun.xyz` in Railway frontend env
- (Optional, source maps) Set `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` in Railway build env for prettier Sentry stack traces
- (Recommended for vault visibility) Set `ALERT_TELEGRAM_BOT_TOKEN` and `ALERT_TELEGRAM_CHAT_ID` on Railway `lick-keeper` service
- Send `/terms` and `/privacy` to legal counsel for review before treating as binding (both pages display the draft notice until then)

### Git history (this session, this commit)
- All 13 modified files + 13 untracked new files (Sentry/Analytics/Terms/Privacy/Footer/ProfileStorage/VaultAlerting) committed in a single commit
- TODO: commit message and push via git (handled by user OR follow-up commit push)

---

# Session Memory — 2026-07-09 (newest) — Second reconcile batch: recurring untracked-vault-MON fix, now 4 tokens

## Task: Diagnose "founder token burn function isn't working" — generate the next reconcile batch

Continuation of the 2026-07-03/04/05 buyback-and-burn saga (see below). The root cause (live `FeeRouter` predates the `receiveForToken()` audit fix and can never be replaced — `Factory.feeRouter` is set-once) means the V1→V2 migration executed on 2026-07-05 was **not** a permanent fix — it only reconciled the funds accumulated *up to that point*. Every trade fee since then has kept landing in the vaults via the broken raw-send path, silently growing the untracked balance again. This is a **recurring maintenance task**, not a one-time fix, for as long as this FeeRouter is live.

### Findings this session (verified fresh on-chain, not reused from prior chat)
- **4 tokens now launched** (not 3): Founder (`0x0236...d151`), `0x801a...18C09` (no fee activity yet), Token4 (`0x7f56...61c7`), BLOB (`0x46c2...52d4a`).
- Re-verified V2 vault config is correct and safe to execute against: owner = multisig Safe, factory/graduationRouter/lickRouter all correctly wired, 5% max slippage.
- Re-verified all 4 tokens are still pre-graduation (Founder realMon 42,940 / 100,000 threshold — nowhere near the 1% `NearGraduation` safety cutoff), so `VaultBuybackBurnV2.execute()` will take the safe "buy on curve → transfer to dead address" path, not the DEX-swap path. No revert conditions apply.
- Confirmed `VaultRecouper` (`0x3b0e...2b91`) is still live with matching bytecode.
- **BB vault**: balance 121.865615572600394514 MON, all of it untracked (0 across all `pendingBurn` mappings). Wei-exact split since the last reconcile (block 85683063): Founder 121.655615572600394514, Token4 0.15, BLOB 0.06.
- **LP vault**: balance 838.274594491814972292 MON. 349.954132201413394194 already correctly attributed to Founder's `pendingLP` from the last reconcile; the remaining 488.320462290401578098 MON is untracked (Founder 488.310462290401578098, BLOB 0.01, Token4 0). Balance − untracked exactly equals the already-attributed amount — confirms the accounting model is correct with no drift/bugs.

### New tooling: `script/generate-reconcile-batch.mjs`
Generalizes the ad-hoc reconcile process from a one-off manual script into a repeatable generator:
- Re-queries live on-chain state every run (never trusts stale numbers).
- For each vault, finds its own last `Deposited` event (i.e. the last time it was reconciled) and sums `FeeRouted.<share>` events strictly after that block, **per token** — this is the exact untracked amount.
- Emits a ready-to-import Safe Transaction Builder JSON: `sweep(safe, sumUntracked)` followed by one `VaultRecouper.recover(vault, token)` call per token with nonzero untracked amount (properly split across all tokens, not lumped into Founder like the very first reconcile batch was).
- Automatically skips a vault entirely if there's nothing untracked.
- Output: timestamped `safe-batch-reconcile-<ts>.json` — this session's run produced **`script/safe-batch-reconcile-2.json`** (renamed from the timestamped default), containing 7 transactions (3 for BB vault: 1 sweep + 3 recovers; 4 for LP vault: 1 sweep + 3 recovers — Token4 skipped, 0 untracked).
- Can be re-run any time in the future to generate the next reconcile batch — this is now the standing procedure instead of writing a fresh script each time.

**Double-check before execution:** Independently re-verified the batch amounts with a fresh, separate on-chain read (new script, latest block 86634371, 2026-07-09T13:43:21Z) immediately before handing off — BB vault balance, LP vault balance, and all `pendingBurn`/`pendingLP` values matched the batch's assumptions exactly (0 drift). Also re-ran `generate-reconcile-batch.mjs` a second time independently and got byte-for-byte identical wei amounts, confirming no new trades landed on these vaults in the intervening minutes.

### ✅ CONFIRMED SUCCESS — batch executed, buyback and burn achieved
User imported `script/safe-batch-reconcile-2.json` into the Safe Transaction Builder and executed all 7 transactions. `pendingBurn(founder)` crossed the 50 MON threshold and the Railway keeper fired `execute()` — buyback + burn completed successfully.

**No environment variable or Railway redeploy was needed for this step.** This reconcile batch only moved MON that was already sitting in the existing V2/LP vaults (via `sweep()`) and re-deposited it back into those *same* vaults (via `VaultRecouper.recover()`) with corrected per-token attribution — it did not change which contract addresses are in use. `VAULT_BUYBACK_ADDR` and `VAULT_LP_ADDR` were already correctly set from the 2026-07-05 V1→V2 migration and required no changes. Env var updates are only needed when a *new* contract is deployed (as happened during that V1→V2 migration) — not for routine balance reconciliation.

### Temporary diagnostic scripts cleaned up
`script/_diagnose.mjs`, `_diagnose2.mjs`, `_diagnose_lp.mjs`, `_verify_execute.mjs`, `_selectors.mjs`, `_recheck.mjs` were created this session purely to verify live on-chain state before/after generating the batch — all deleted after `generate-reconcile-batch.mjs` was written to supersede them permanently. Also updated `script/README.md` with a new "Vault reconciliation (recurring maintenance)" section documenting `generate-reconcile-batch.mjs` as the standing procedure, plus an updated mainnet contract address table (VaultBuybackBurnV2, VaultLPSupport, VaultRecouper, multisig Safe).

## Git History (this session)
- Commit `(pending)` — Add `script/generate-reconcile-batch.mjs` (recurring reconcile generator) + `script/safe-batch-reconcile-2.json` (second reconcile batch, 4-token split, executed successfully) + `script/README.md` vault-reconciliation docs + MEMORY.md update.

---

# Session Memory — 2026-07-05 (newest) — Fix: token pages showing "??? Unknown Token" browser tab title

## Task: Diagnose and fix browser tab showing "??? Unknown Token" on all token pages

User reported that after the recent indexer/SEO changes, every token trading page's browser tab title showed "??? Unknown Token" instead of the real token name/symbol (including the founder token page).

### Root cause
The Envio indexer **intentionally** stores empty `name`/`symbol` strings for every `Token` entity — `context.client.readContract` is not available in Envio Cloud deployments (see `indexer/src/EventHandlers.ts` comment). The client-side token page (`frontend/src/app/token/[id]/page.tsx`) already correctly works around this via `useTokenMeta()` in `frontend/src/lib/hooks/useData.ts`, which does an on-chain `name()`/`symbol()` read via wagmi whenever the indexer values are blank.

However, the SEO/GEO commit from earlier this session (`4f3b911`) added server-rendered `generateMetadata()` functions that read `token.name`/`token.symbol` **directly from the indexer GraphQL response with no on-chain fallback**:
- `frontend/src/app/token/[id]/layout.tsx` — `const name = token.name || "Unnamed Token"; const symbol = token.symbol || "???";`
- `frontend/src/app/api/og/token/[id]/route.tsx` — same pattern (`"Unknown Token"` / `"???"`)

Since indexer name/symbol are always empty strings, these always fell back to the placeholder text. Next.js App Router's `<title>` tag comes exclusively from `generateMetadata()` (server-rendered) — the client-side page's later RPC-resolved name/symbol has **no effect on `document.title`**. Same issue affected the dynamic OG/share image.

### Fix
- **`frontend/src/lib/server/resolveTokenMeta.ts` (new)** — Server-side helper using a plain `viem` `createPublicClient` (no wagmi/React dependency, mirrors the existing pattern in `frontend/src/app/api/trades/[curve]/route.ts`). Returns indexer name/symbol as-is if both are non-empty; otherwise reads `name()`/`symbol()` directly from the ERC-20 contract via RPC, falling back to a truncated address / `"???"` if the RPC call also fails (never throws).
- **`frontend/src/app/token/[id]/layout.tsx`** — `generateMetadata()` now calls `resolveTokenMeta(tokenId, token.name, token.symbol)` instead of using the raw indexer fields directly, so the `<title>`, meta description, and OG/Twitter tags use the real on-chain name/symbol.
- **`frontend/src/app/api/og/token/[id]/route.tsx`** — Same fix applied so the dynamic OG share image also shows the real name/symbol instead of "Unknown Token"/"???".

**Verified:** `npx tsc --noEmit -p frontend/tsconfig.json` passes with zero errors.

**Lesson for future server-side Envio consumers:** Any server component/route that needs a token's `name`/`symbol` for user-facing output (title tags, OG images, etc.) must NOT trust the indexer's `Token.name`/`Token.symbol` fields directly — they are always empty strings by design. Always resolve through `resolveTokenMeta()` (or an equivalent on-chain fallback) rather than assuming client-side hooks like `useTokenMeta()` will "fix" it, since client components can't influence server-rendered `<title>` metadata.

## Git History (this session)
- Commit `(pending)` — Fix "??? Unknown Token" tab title: add resolveTokenMeta server helper, wire into token layout + OG image route.

---

# Session Memory — 2026-07-05 (latest) — SEO/GEO optimization for Lickfun.xyz


## Task: Full SEO + Generative Engine Optimization (GEO) pass

User asked for up-to-date SEO best practices research (with emphasis on AI crawlers/AI answer engines) followed by implementation across the Next.js 15 App Router frontend.

### Files added/changed
- `frontend/src/app/sitemap.ts` (new) — Dynamic `MetadataRoute.Sitemap` combining static routes (`/`, `/discover`, `/create`, `/markets`, `/how-it-works`) with every indexed token (`/token/[id]`) and profile (`/profile/[address]`) page, sourced live from the Envio GraphQL indexer. Capped at 5000 tokens / 2000 profiles. Fails soft (falls back to static routes only) if the indexer is unreachable. Uses minimal `SitemapTokenRow`/`SitemapProfileRow` interfaces (string fields only, since only `Number(createdAt)` and boolean `graduated` are used — no BigInt arithmetic needed here).
- `frontend/src/lib/bondingCurve.ts` (new) — Server-safe (no `"use client"`) pure bonding-curve math extracted from `wagmi/contracts.ts`: `getTokenPrice(realMon, soldTokens)`, `getGraduationProgress(realMon)`, `formatMon(wei)`, `formatTokens(wei)`.
- `frontend/src/app/token/[id]/layout.tsx` (new) — `generateMetadata()` producing dynamic title/description/canonical/OG/Twitter tags per token (price, market cap, graduation status pulled live from the indexer + bonding curve math), plus a `BreadcrumbList` JSON-LD script in the layout body.
- `frontend/src/app/api/og/token/[id]/route.tsx` (new) — Edge-runtime dynamic OG image (`next/og` `ImageResponse`, 1200×630) rendering token symbol/name/price/market cap/graduation status with Lickfun.xyz branding.
- `frontend/src/app/profile/[address]/layout.tsx` (new) — `generateMetadata()` for profile pages (reputation stats, token count, volume) + `BreadcrumbList` JSON-LD. Reads off-chain display name/avatar from `frontend/src/data/profile-metadata.json`.
- `frontend/src/app/discover/layout.tsx`, `frontend/src/app/markets/layout.tsx`, `frontend/src/app/create/layout.tsx` (new) — Static per-page `metadata` exports (unique title/description/canonical/OG/Twitter).
- `frontend/src/app/layout.tsx` — Added `alternates.canonical`, plus sitewide `Organization` + `WebSite` (with `SearchAction`) JSON-LD.
- `frontend/src/app/how-it-works/page.tsx` — Added a 7-question visible FAQ section + matching `FAQPage` JSON-LD (for AI answer-engine extraction/rich results). Replaced raw `<img>` logo with `next/image`.
- `frontend/public/robots.txt` — Added explicit `Allow: /` rules for AI crawlers: GPTBot, ChatGPT-User, OAI-SearchBot, ClaudeBot, Claude-Web, anthropic-ai, PerplexityBot, Perplexity-User, Google-Extended, GoogleOther, Applebot-Extended, Bytespider, CCBot, Meta-ExternalAgent, cohere-ai. Kept `Disallow: /api/` + `Allow: /api/og/` + `Sitemap:` reference.
- `frontend/public/llms.txt` — Expanded with a Key Facts section, per-page-type descriptions (including the token/profile URL patterns), and machine-readable endpoints, per the emerging `llms.txt` convention for LLM/AI-agent site discovery.

### Bug found + fixed after initial implementation
User hit a runtime error on the token page: `Cannot mix BigInt and other types, use explicit conversions` in `getTokenPrice()` called from `token/[id]/layout.tsx`'s `generateMetadata()`.

**Root cause:** Envio's GraphQL API serializes all bigint-typed scalar fields (`realMon`, `soldTokens`, `virtualMon`, `createdAt`, `totalBuyVolume`, etc.) as JSON strings, not native numbers/bigints. The existing client-side code (`frontend/src/lib/hooks/useData.ts`) already has `toBigIntToken`/`toBigIntTrade`/`toBigIntProfile` converters that explicitly `BigInt(raw.field)` each field before use — but my new server-side files unsafely cast the raw GraphQL JSON response straight to `TokenEntity`/`ProfileEntity` (which declare `bigint` fields) without actually converting, so `VIRTUAL_TOKENS - soldTokens` mixed `bigint` and `string` and threw.

**Fix:** Added local `toBigIntToken()` / `toBigIntProfile()` converters (mirroring the `useData.ts` pattern) to all three affected files — `token/[id]/layout.tsx`, `api/og/token/[id]/route.tsx`, `profile/[address]/layout.tsx` — changing their GraphQL response interfaces to `Record<string, unknown> | null` and explicitly calling `BigInt(raw.field as string)` on every bigint field before use. Also tightened `sitemap.ts`'s types to `string` fields (it wasn't actually crashing since it only used `Number()`, but the types previously claimed `bigint`/`TokenEntity` incorrectly).

**Verified:** `npx tsc --noEmit -p frontend/tsconfig.json` passes with zero errors after the fix.

**Lesson for future server-side Envio GraphQL consumers:** Always treat raw GraphQL JSON responses as having `string` (not `bigint`) for any field typed `bigint` in `TokenEntity`/`ProfileEntity`/`TradeEntity` in `frontend/src/lib/graphql/queries.ts`, and run it through the appropriate `toBigInt*` converter (or a local equivalent) before doing any BigInt arithmetic — this applies both client-side (already handled in `useData.ts`) and server-side (any future `generateMetadata`, route handler, or server component that queries the indexer directly).

## Git History (this session)
- Commit `(pending)` — Full SEO/GEO implementation + BigInt bug fix.

---

# Session Memory — 2026-07-05 (later) — Frontend: label V2 vault in Recent Trades + on-chain migration status check


## Frontend change: Buyback & Burn vault address now shows friendly label, not clickable

- **Files changed:**
  - `frontend/src/lib/knownAddresses.ts` — added the new `VaultBuybackBurnV2` address (`0xd22bEf54aD5baeA2C21a80B91E38C5B67Cbb1822`) to `KNOWN_ADDRESS_LABELS` mapped to `"🔥 Buyback and Burn"`. Fixed a misleading comment (the old V1 entry was mislabeled "v2 (active)" when V1 is actually the broken/deprecated one — relabeled as v1/v0 deprecated, V2 as the active one). Added a new exported helper `isKnownAddress(addr)` that returns true for any address in the map.
  - `frontend/src/app/page.tsx` — the homepage "Recent Trades" marquee ticker previously wrapped every trade pill in a `<Link href="/token/[id]">` unconditionally. Now checks `isKnownAddress(trade.trader)` first: if the trader is a known automated vault (Buyback & Burn or LP Support, any version), the pill renders as a plain non-clickable `<div>` (with `cursor-default`) instead of a `<Link>` — so clicking it does nothing. Real user trades are unaffected and still navigate to the token page as before.
- **Why:** The V2 buyback vault will soon start appearing as a "trader" in the Recent Trades feed once the Safe migration batch executes and the keeper starts calling `execute()` on it. Without this change it would show as a raw truncated address (e.g. `0xd22b...1822`) and be clickable like a normal trader, which is confusing since it's an automated contract, not a real wallet. This mirrors the exact pattern already used for V1's address and for `CreatorBadge.tsx` (which independently already reads from `KNOWN_ADDRESS_LABELS` and disables click-through for known addresses — so the token detail page's trade history table picks up the same fix automatically, no changes needed there).
- **Verified:** `npx tsc -p tsconfig.json --noEmit` passes clean, no type errors.

## On-chain verification — migration batch NOT yet executed (as of this session)

Re-checked live on-chain state on Monad mainnet before this session's frontend change:
- `FeeRouter.buybackBurnVault` still points to **V1** (`0x45B1...06d`) — the Safe migration batch (`script/safe-batch-v2-migrate.json`) has **not** been executed yet.
- V1 vault balance: **87.910533 MON** (`87910533050353348537` wei) — this is an **exact match** to the amounts already hardcoded in `safe-batch-v2-migrate.json` (both the `sweep` and `recover` calls). No drift since the file was generated — the batch file does NOT need to be regenerated, it's ready to execute as-is.
- V1 `pendingBurn(founder)` = 87.49 MON (already populated from the *first* reconcile batch executed earlier this session, `safe-batch-reconcile.json`) — but V1 can never successfully `execute()` since it calls the nonexistent `token.burn()`.
- V2 vault (`0xd22b...1822`) balance = 0, `pendingBurn(founder)` = 0 — confirms V2 hasn't received any funds yet, the migration batch is still outstanding.
- LP vault: 351.64 MON, `pendingLP(founder)` = 349.95 MON — untouched, correct, waiting for the founder curve to graduate naturally.

**Outstanding steps for the user (unchanged from previous update, still pending):**
1. Execute `script/safe-batch-v2-migrate.json` via Safe Transaction Builder (app.safe.global, multisig `0x9F3fDE2C42BA3B00110fC4dc3365782dFE2743fA`) — re-points FeeRouter to V2, sweeps V1, re-deposits into V2 attributed to founder token.
2. Update Railway `VAULT_BUYBACK_ADDR` env var to `0xd22bEf54aD5baeA2C21a80B91E38C5B67Cbb1822` and redeploy.
3. Watch keeper logs for successful `execute()` call on V2 (tokens transferred to `0x...dEaD`).

## Git History (this session)
- Commit `8e599e9` — VaultBuybackBurnV2 deployed + migration batch + MEMORY.md update.
- Commit `c08cb17` — frontend: label V2 vault address as "Buyback and Burn" in Recent Trades, make non-clickable.

## 🎉 CONFIRMED SUCCESS — Migration executed, first V2 burn completed

User executed the Safe migration batch. Re-verified on-chain immediately after:

- `FeeRouter.buybackBurnVault` → `0xd22bEf54aD5baeA2C21a80B91E38C5B67Cbb1822` (**V2 — migration confirmed** ✓)
- V1 vault balance: **0 MON** (fully drained by the `sweep()` call)
- V2 vault balance: 0.1758 MON (fresh trickle of new trade fees already accumulating post-migration)
- V2 `pendingBurn(founder)` = **0 MON** — confirms the keeper successfully called `execute()` on V2 (the mapping resets to 0 after a completed buyback+burn cycle; it was ~87.9 MON immediately after the migration, now back to 0)
- Dead address (`0x...dEaD`) founder token balance: **11,343,665.77 tokens** — increased from the pre-migration baseline, confirming freshly-bought tokens from the V2 buyback were successfully transferred to the burn address

**The fix is fully validated end-to-end on mainnet: buyback → burn-to-dead-address works correctly with the pre-audit-fix founder token, and will work identically for the other 2 launched tokens and any future token launched through the platform** (since it only relies on the standard ERC20 `transfer()` function, not the newer `burn()` function).

**Nothing further required from either side right now** — the system is self-sustaining. As new trade fees accumulate in V2 past the 50 MON threshold per token, the Railway keeper will automatically call `execute()` and burn again, with no manual intervention needed.

---

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

### Update 2026-07-04 — VaultRecouper deployed to mainnet

- Fixed a syntax error in `script/reconcile-vaults.mjs` (unbalanced template literal + duplicate `const lpBal`) that was blocking the user's first attempt to run it.
- Fixed a missing `=` in `script/.env` (`RECOUPER_ADDR0x...` instead of `RECOUPER_ADDR=0x...`).
- **`VaultRecouper` deployed to Monad mainnet:** `0x3b0e57DBd9F80dB7963aa80A1167A224eD5E2b91` (tx `0xcccb42804a1dea619a4fcf06ff1319492d0be86a769985b50b995a56528abe73`). Verified via bytecode inspection — `recover(address,address)` selector present, contract live.
- Confirmed the deployer wallet (`0xB99d37f0B57d8ce9b67b2372cC0E17D3577aEAAb`) is **not** the vault owner — only the multisig Safe (`0x9F3fDE2C42BA3B00110fC4dc3365782dFE2743fA`, 344-byte contract) can call `sweep()`. This means `reconcile-vaults.mjs` cannot be run directly with a hot wallet key; it must be executed via the Safe (either by having a Safe owner sign a raw tx with the script's logic, or via Safe Transaction Builder).
- **Generated `script/safe-batch-reconcile.json`** — a ready-to-import Safe Transaction Builder batch with all 4 calls (sweep BB → sweep LP → recover BB → recover LP) pre-filled with live on-chain balances as of 2026-07-04: BuybackBurn 87.49 MON, LPSupport 349.95 MON (balances keep growing from ongoing trades — must be re-verified as current before executing).
- Cleaned up all temporary `_investigate*.mjs` / `_check*.mjs` / `_verify*.mjs` scripts (untracked, not committed).

**Next step for user:** Import `script/safe-batch-reconcile.json` into the Safe Transaction Builder app (app.safe.global, connect to the multisig), double-check the `amount`/`value` fields match the *current* vault balances (they grow continuously), and execute the batch with the required multisig signatures. Once confirmed, `pendingBurn(founder)` and `pendingLP(founder)` will both exceed the 50 MON threshold and the Railway keeper will call `execute()` automatically within ~60 seconds.

### Update 2026-07-04 (later) — Safe batch executed, but `execute()` reverts. Root cause: deployed tokens have no `burn(uint256)` function.

- User executed the Safe batch successfully. After it confirmed, the Railway keeper immediately tried `VaultBuybackBurn.execute(founder)` and got `The contract function "execute" reverted.` (raw revert data was empty `0x`).
- **Root cause (confirmed via bytecode inspection of all 3 launched tokens):** the deployed `LickToken` contracts on mainnet were deployed *before* the audit added the `burn(uint256)` function. None of the 3 currently-launched tokens have a `burn(uint256)` selector (`0x42966c68`) in their bytecode. `VaultBuybackBurn.execute()` correctly buys tokens from the curve, then calls `ILickToken(token).burn(tokensBurned)` — which reverts with empty data because the function doesn't exist (and pure OpenZeppelin ERC20 has no fallback). This affects **all 3 launched tokens**, not just the founder one.
- **LPSupport revert is NOT a bug** — it reverts with `NotGraduated()` (selector `0xd66173a5`) because the founder curve has only 22,583 MON of the 100,000 MON graduation threshold. The 349.95 MON is safe in `pendingLP[founder]` and will execute automatically once the curve graduates naturally.
- **The fix:** deploy a new `VaultBuybackBurn` variant that burns via `IERC20(token).transfer(0x...dead, amount)` instead of calling `token.burn()`. `transfer()` is part of the standard ERC20 interface and exists on every token, so this works for any token — current pre-fix tokens AND any future tokens launched through the platform. Same economic effect (tokens permanently removed from circulating supply). Then:
  1. Deploy new vault.
  2. Multisig calls `FeeRouter.setVaults(newLP, newBB)` to re-point the FeeRouter (this is freely re-callable, no lock).
  3. Sweep the old `VaultBuybackBurn` balance to the multisig, then re-deposit via `VaultRecouper.recover(newBB, founder)` to migrate the 87 MON over.
  4. Update Railway env var `VAULT_BUYBACK_ADDR` to the new address.
  5. The keeper will then call `execute()` on the new vault and it will succeed.

**Files to create/modify for the fix (next chat window should pick this up):**
- `contracts/src/VaultBuybackBurnV2.sol` (new) — same as `VaultBuybackBurn.sol` but replace `ILickToken(token).burn(tokensBurned)` with `IERC20(token).safeTransfer(0x...dead, tokensBurned)`. Keep all other logic identical (slippage check, threshold, receiveForToken, sweep, etc.).
- `contracts/script/DeployVaultBuybackBurnV2.s.sol` (new) — forge deploy script.
- `script/safe-batch-v2-migrate.json` (new) — Safe Transaction Builder batch: (a) `FeeRouter.setVaults(LP_VAULT, NEW_BB_VAULT)`, (b) `VaultBuybackBurn.sweep(safe, currentBalance)`, (c) `VaultRecouper.recover(NEW_BB_VAULT, founder)` with that amount.
- `script/.env` — add `VAULT_BUYBACK_V2_ADDR=0x...` after deploy.
- `script/graduation-keeper.ts` — no code change needed; just update the Railway env var `VAULT_BUYBACK_ADDR` to the new address.
- `MEMORY.md` — update with new vault address + migration tx hashes.

**Important context for the next chat window:**
- All 3 currently-launched tokens (`0x0236787a1bAaEeD46a123fa264A2355eed11d151` founder, `0x801a16813823559Fb3825e1076bd2A252Bd18C09`, `0x46C26cA65f0b3E54C300F819cc73351141152D4a`) have the pre-fix bytecode (no `burn()`). The new vault must work with these AND any future tokens.
- `FeeRouter.setVaults()` is freely re-callable (no lock) — confirmed in source. So re-pointing is safe.
- `Factory.feeRouter` and `BondingCurve.feeRouter` are set-once — cannot be re-pointed. But since `FeeRouter.setVaults()` is re-callable, the vaults can be swapped without touching the curves.
- The `VaultRecouper` contract is already deployed at `0x3b0e57DBd9F80dB7963aa80A1167A224eD5E2b91` and works for any vault that has `receiveForToken(address)` — the new V2 vault should keep this entrypoint so `VaultRecouper` continues to work for migration.
- The multisig Safe is `0x9F3fDE2C42BA3B00110fC4dc3365782dFE2743fA`. The deployer/hot wallet `0xB99d37f0B57d8ce9b67b2372cC0E17D3577aEAAb` is NOT the owner — only the Safe can call `sweep()` and `setVaults()`.
- The Railway keeper service has env vars `VAULT_BUYBACK_ADDR` and `VAULT_LP_ADDR` set. After deploying V2, update `VAULT_BUYBACK_ADDR` to the new address and redeploy the Railway service.
- The `VaultLPSupport` vault is fine as-is — it doesn't call `token.burn()`, it just adds liquidity to the DEX pair. It only works post-graduation, which is expected behavior.

## Git History
- Commit `24875ab` (2026-07-03 morning) — Investigation findings logged.
- Commit `113c906` — VaultRecouper.sol + reconcile scripts added.
- Commit `b17f137` — Bug fixes to reconcile-vaults.mjs/.env, VaultRecouper deployed to mainnet, Safe batch JSON added.

### Update 2026-07-05 — VaultBuybackBurnV2 deployed to mainnet (burn-to-dead-address fix)

- **Root cause confirmed:** All 3 currently-launched tokens (`0x0236787a1bAaEeD46a123fa264A2355eed11d151` founder, `0x801a16813823559Fb3825e1076bd2A252Bd18C09`, `0x46C26cA65f0b3E54C300F819cc73351141152D4a`) were deployed BEFORE the audit added `burn(uint256)` to `LickToken`. None of them have the `burn(uint256)` selector (`0x42966c68`) in their bytecode. `VaultBuybackBurn.execute()` correctly buys tokens from the curve, then calls `ILickToken(token).burn(tokensBurned)` which reverts with empty data because the function doesn't exist (and pure OpenZeppelin ERC20 has no fallback). This affects ALL 3 launched tokens, not just the founder one.
- **LPSupport revert is NOT a bug** — it reverts with `NotGraduated()` (selector `0xd66173a5`) because the founder curve has only 22,583 MON of the 100,000 MON graduation threshold. The 351.64 MON is safe in `pendingLP[founder]` and will execute automatically once the curve graduates naturally.
- **Fix implemented:** `VaultBuybackBurnV2` — same as V1 but uses `IERC20(token).safeTransfer(0x...dEaD, tokensBought)` instead of `token.burn(tokensBought)`. `transfer()` is part of the standard ERC20 interface and exists on every token, so this works for any token — current pre-fix tokens AND any future tokens launched through the platform. Same economic effect (tokens permanently removed from circulating supply).
- **`VaultBuybackBurnV2` deployed to Monad mainnet:** `0xd22bEf54aD5baeA2C21a80B91E38C5B67Cbb1822` (tx `0xea301823dd6464afde8ee5150e0f2350e6bc4b55bfa2eaa0bd65521f3c3e9e66`). Verified on-chain: owner = multisig ✓, BURN_ADDRESS = 0x...dEaD ✓, all required selectors present ✓, factory/graduationRouter/lickRouter wired correctly ✓. Simulated `execute()` correctly reverts with `BelowThreshold` (selector `0xae274200`) when pendingBurn is 0.
- **Constructor args used:** owner=`0x9F3fDE2C42BA3B00110fC4dc3365782dFE2743fA` (multisig), lickRouter=`0xd0cc6c69162eb0635a7d423aeb2086f1821ca844`, factory=`0x9845c5625d9f9C48e17956940485aAAAD168aA10`, graduationRouter=`0xb2Dc164Ac4eCDDA7Ea2D4115bC122463c65460b2`.
- **Generated `script/safe-batch-v2-migrate.json`** — ready-to-import Safe Transaction Builder batch with 3 calls: (a) `FeeRouter.setVaults(LP_VAULT, V2_BB_VAULT)` to re-point the FeeRouter, (b) `VaultBuybackBurn.sweep(safe, 87.91 MON)` to drain the old V1 vault, (c) `VaultRecouper.recover(V2_BB_VAULT, founder)` with 87.91 MON to re-deposit into V2 attributed to the founder token. Balances must be re-verified as current before executing since fees accrue continuously.
- **Updated `script/.env`** with `VAULT_BUYBACK_V2_ADDR=0xd22bEf54aD5baeA2C21a80B91E38C5B67Cbb1822`. After the Safe batch executes, the user must update the Railway service's `VAULT_BUYBACK_ADDR` env var to the V2 address and redeploy the Railway service.

**Next step for user:** Import `script/safe-batch-v2-migrate.json` into the Safe Transaction Builder app (app.safe.global, connect to the multisig), double-check the `amount`/`value` fields match the *current* vault balances (they grow continuously), and execute the batch with the required multisig signatures. After it confirms, update the Railway service's `VAULT_BUYBACK_ADDR` env var to `0xd22bEf54aD5baeA2C21a80B91E38C5B67Cbb1822` and redeploy. The keeper will then call `execute()` on V2 and the buyback+burn will succeed — tokens will be transferred to `0x...dEaD` permanently.





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

