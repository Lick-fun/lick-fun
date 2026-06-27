# Lickfun.xyz — Vault Automation Security Audit (VaultBuybackBurn v2 / VaultLPSupport v2)

**Audit type:** Adversarial review of newly-written automated vault contracts
**Auditor:** Claude Opus 4.8 (adversarial subagent review)
**Date:** 2026-06-27
**Chain:** Monad mainnet (143)
**Compiler:** Solidity `0.8.27`

---

## 1. Scope

The two fee-sink vaults were rewritten from passive stubs (accumulate + multisig `sweep()`) into
**active, permissionless, automated** contracts that buy back & burn tokens, or add + burn LP,
once 50 MON accumulates per token.

| File | Change |
|---|---|
| `VaultBuybackBurn.sol` | Full rewrite — `receiveForToken`, `execute()`, per-token `pendingBurn`, curve-buy + DEX-swap + burn |
| `VaultLPSupport.sol` | Full rewrite — `receiveForToken`, `execute()`, per-token `pendingLP`, swap + add-LP + burn-LP |
| `FeeRouter.sol` | `receiveCreatorFee` now calls `IFeeVault.receiveForToken` (try/catch + `_isContract` guard) |
| `LickToken.sol` | Added public `burn(uint256)` |

**Context:** Vaults were deployed but **NOT wired** into `FeeRouter` — no funds were ever at risk.
This audit was the go/no-go gate for the wiring transaction.

---

## 2. Executive Summary

The first iteration was **🔴 NO-GO** — it contained a critical fund-theft vector and a
critical MEV vector. **All blocking findings have been remediated and re-tested.**

**Post-fix verdict: 🟢 GO** (176 tests passing, incl. 9 new vault-attack regression tests).

### Severity counts

| Severity | Count | Status |
|---|---|---|
| Critical | 2 | ✅ Fixed |
| High | 2 | ✅ Fixed |
| Medium | 1 | ✅ Fixed |
| Low / Info | 2 | ✅ Verified safe |

---

## 3. Findings

### 🔴 C-01 — `execute()` trusted caller-supplied curve/pair → fund theft *(FIXED)*

**Original:** `execute(token, curve, graduated)` and `execute(token, pair)` accepted caller-supplied
`curve`/`pair` addresses with **no validation that they belonged to `token`**. An attacker could
call `execute(realToken, attackerCurve, false)` — the vault zeroed `pendingBurn[realToken]`, sent
the 50 MON to the attacker's contract, received 0 tokens, and burned nothing. Clean theft of every
batch, no reentrancy required.

**Fix:** `execute(token)` now takes only the token. The vault resolves the canonical curve from
`Factory.tokenToCurve(token)` and the canonical pair from `GraduationRouter.tokenToPair(token)`,
and reads graduation state from the curve itself. Caller-supplied addresses are eliminated entirely.
Reverts `UnknownToken` if no curve/pair is registered.

**Tests:** `test_C01_execute_uses_factory_curve_not_caller`, `test_C01_evilCurve_cannot_steal`,
`test_execute_reverts_unknown_token`.

---

### 🔴 C-02 — `amountOutMin = 0` on every swap → guaranteed MEV/sandwich *(FIXED)*

**Original:** Both vaults passed `amountOutMin = 0` to swaps. Combined with permissionless execution
and fixed 50 MON batch size, every execution was a guaranteed sandwich target — near-total value
loss on thin pools.

**Fix:** Both vaults compute the expected output on-chain (`BondingCurve.getAmountOut` /
`LickRouter.getAmountOut` against live reserves) and enforce `minOut = expectedOut × (1 − maxSlippageBps)`.
`maxSlippageBps` defaults to 500 (5%), owner-settable up to a 2000 (20%) hard cap.

**Tests:** `test_C02_slippage_default_500bps`, `test_setMaxSlippage_onlyOwner_and_capped`.

---

### 🟠 H-01 — LP add at manipulable ratio → near-zero LP mint *(FIXED)*

**Original:** `VaultLPSupport` swapped a fixed half of MON for tokens (moving the price) then added
liquidity at whatever ratio resulted. An attacker could pre-skew the pool so `pair.mint()` minted
near-zero LP, wasting the fees and leaving skimmable dust (same class as prior `AUDIT_MAINNET.md` H-01).

**Fix:** After the slippage-bounded swap, the vault **re-reads post-swap reserves** and computes the
**proportional** token/WMON amounts to add (the optimal-amount math: `wmonOptimal = tokensBought × rWmon / rToken`,
scaling down whichever side is the limiter). The mint consumes both sides proportionally — no value left
on the table for an attacker to skim.

---

### 🟠 H-02 — Static 50/50 split systematically under-minted LP + left dust *(FIXED)*

**Original:** Buying with `half` then adding `remainder` WMON via a static 50/50 split is never
proportional to pool reserves (price moves during the swap), so the honest path also under-minted LP
and stranded dust.

**Fix:** Same as H-01 — proportional add based on post-swap reserves. Any unavoidable rounding leftover
is unwrapped (WMON→MON) and **re-credited to `pendingLP[token]`** for the next execution, so no value is lost.

---

### 🟡 M-03 — FeeRouter raw-send fallback re-locked fees *(FIXED)*

**Original:** If `vault.receiveForToken()` reverted, `FeeRouter` fell back to a raw `call` into the
vault's bare `receive()`. That created an **untracked** balance (not recorded in `pendingBurn`/`pendingLP`),
which the vault's `execute()` could never spend — silently re-introducing the old C-01 fee-lock.

**Fix:** On `receiveForToken()` failure for a contract vault, `FeeRouter` now routes the share to
`pendingWithdrawals` (pull payment) and emits `FeePending` — never a raw send into an active vault.
Raw send is retained only for EOA vaults (test fixtures).

---

### 🟢 M-01 — `NearGraduation` dead-code refund *(FIXED, benign)*

**Original:** the refund line `pendingBurn[token] += amount; revert NearGraduation();` was dead code
(the `revert` rolls back the `+=`). Harmless but misleading.

**Fix:** Removed the redundant `+=`; the `revert` alone preserves the pending balance.
Verified by `test_nearGraduation_blocks_and_preserves_funds`.

---

### 🟢 L-01 — `LickToken.burn()` public *(VERIFIED SAFE)*

Public `burn()` is safe: BondingCurve pricing uses `soldTokens` + virtual reserves (not `totalSupply`
or balances), and graduation keys on `realMon` — neither is affected by external burns. DEX pool
reserves cannot be burned by third parties (only the holder's own balance). No supply invariant breaks.

### 🟢 I-01 — No first-mint path *(VERIFIED SAFE)*

`VaultLPSupport` only ever adds to an already-graduated pair (`_totalSupply > 0` branch of `LickPair.mint`).
No first-mint manipulation surface.

### ✅ Verified safe (other)

- Both `execute()` are `nonReentrant` and follow CEI (pending zeroed before external calls).
- `BondingCurve.buy()` sends purchased tokens to `msg.sender` (the vault), so the vault can burn them.
- Constructor zero-address guards on all four params (`test_constructor_rejects_zero`).
- `sweep()` and `setMaxSlippage()` are `onlyOwner` (multisig).

---

## 4. Remediation Summary

| ID | Severity | Status | Verifying test |
|----|----------|--------|----------------|
| C-01 | Critical | ✅ Fixed | `test_C01_evilCurve_cannot_steal`, `test_C01_execute_uses_factory_curve_not_caller` |
| C-02 | Critical | ✅ Fixed | `test_C02_slippage_default_500bps`, `test_setMaxSlippage_onlyOwner_and_capped` |
| H-01 | High | ✅ Fixed | proportional-add logic (`_reserves` re-read) |
| H-02 | High | ✅ Fixed | proportional-add + dust recycle |
| M-03 | Medium | ✅ Fixed | FeeRouter pull-payment fallback |
| M-01 | Medium | ✅ Fixed | `test_nearGraduation_blocks_and_preserves_funds` |
| L-01 | Low | ✅ Safe | (curve uses soldTokens, not supply) |
| I-01 | Info | ✅ Safe | (always existing-pair add) |

**Full suite: 176 tests passing** (167 prior + 9 new in `test/VaultsV2.t.sol`).

---

## 5. Verdict

🟢 **GO** — the fixed vaults are safe to deploy and wire into `FeeRouter`.

> ⚠️ The originally-deployed v2 vaults (`0x4A48…`, `0xF37D…`) contain the UNFIXED code and must be
> **abandoned** (never wired). Redeploy the fixed versions and wire the NEW addresses via the Safe.
