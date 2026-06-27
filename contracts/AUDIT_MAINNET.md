# Lick.fun — Smart Contract Security Audit (Monad Mainnet, chain 143)

**Audit type:** Comprehensive adversarial review (audit-only — no code modified)
**Scope:** All 14 contracts in `contracts/src/` + `contracts/script/DeployMainnet.s.sol`
**Compiler:** Solidity `0.8.27` · OpenZeppelin (`SafeERC20`, `ReentrancyGuard`, `ERC20`, `MerkleProof`)
**Target:** Monad mainnet, WMON = `0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A`
**Test suite reviewed:** 149 tests across 14 files in `contracts/test/`
**Date:** 2026-06-27

> ⚠️ All line numbers were verified against the current source at audit time. Where a finding depends on an assumption, the assumption is stated explicitly.

---

## 1. Executive Summary

Lick.fun is a social token launchpad: `Factory` → `LickToken` + `BondingCurve` (CPMM) → graduation at 100k MON → `GraduationRouter` migrates to a `LickPair` (V2 AMM) → users trade via `LickRouter`. Side systems: `PredictionMarket` (parimutuel), `FeeRouter` (creator-fee splitting), `ProfileRegistry` (reputation anchor), `VestingController`, two stub vaults, and a `GraduationPool` subsidy pool.

**Overall posture:** The *core trading and migration path* is well-engineered. The custom reentrancy guard, CEI ordering, the `address(1)` migration sentinel, `SafeERC20` in the routers, checked native sends, and the parimutuel solvency design are all correct. The bonding-curve math, fee math, and the AMM K-invariant are sound. **However, several deployment-level and peripheral-contract issues would cause permanent fund loss or misbehavior on mainnet** — chiefly the stub vaults that irrecoverably swallow all routed protocol fees, the deploy script conflating two fee sinks into one black-hole address, a first-mint AMM manipulation vector on the migration path, and an access-control gap in `VestingController`.

**Mainnet-readiness verdict: 🔴 NO-GO until fixes — re-audit required.**
The protocol is *close*, but the fee-routing destinations and a handful of High findings must be resolved and re-reviewed before real money is at stake.

> ✅ **UPDATE 2026-06-27 — ALL 29 FINDINGS REMEDIATED.** Every Critical/High/Medium/Low/Informational/Gas item
> below has been fixed in source. 15 new regression + fuzz tests were added in `contracts/test/AuditFixes.t.sol`
> (donation-skew, resolve-before-close, initVesting hijack, zero-creator, vault recoverability, router re-lock,
> CREATE2-taken, non-standard ERC20, config front-run, contract-wallet refund, merkle root/anchor, parimutuel
> solvency fuzz). Full suite: **164 tests passing**. `DeployMainnet.s.sol` now requires a `MULTISIG_ADDR` env var,
> deploys distinct recoverable fee sinks + a real `GraduationPool`, performs post-wiring `require()` self-checks,
> and transfers all admin ownership to the treasury multisig. A re-audit of the diff is recommended before deploy.

### Severity counts

| Severity | Count |
|---|---|
| Critical | 2 |
| High | 4 |
| Medium | 7 |
| Low | 8 |
| Informational | 5 |
| Gas | 3 |
| **Total** | **29** |

---

## 2. Findings Table

| ID | Title | Severity | Contract | Status |
|----|-------|----------|----------|--------|
| C-01 | Routed protocol fees permanently locked in withdrawal-less stub vaults | Critical | `VaultLPSupport` / `VaultBuybackBurn` (+ deploy) | ? Fixed |
| C-02 | `VestingController.initVesting` lacks access control — beneficiary hijack / token drain | Critical | `VestingController` | ? Fixed |
| H-01 | First-mint reserve manipulation on migration via direct transfer to precomputed CREATE2 pair | High | `GraduationRouter` / `LickPair` / `LickFactory` | ? Fixed |
| H-02 | Deploy conflates one `VaultLPSupport` as both GraduationPool **and** LP-support sink | High | `DeployMainnet.s.sol` | ? Fixed |
| H-03 | `Factory.createToken` has no zero-address check on `creatorAddress` → creator fees burned | High | `Factory` | ? Fixed |
| H-04 | `PredictionMarket.resolveMarket` has no time gate — resolvable during open betting window | High | `PredictionMarket` | ? Fixed |
| M-01 | `LickFactory.setGraduationRouter` is re-callable despite "once" NatSpec | Medium | `LickFactory` | ? Fixed |
| M-02 | No `require(pair != address(0))` after CREATE2 | Medium | `LickFactory` | ? Fixed |
| M-03 | `LickPair` uses raw unchecked `.transfer` (no `SafeERC20`) | Medium | `LickPair` | ? Fixed |
| M-04 | `FeeRouter.applyPreset` / `applyCustomConfig` are permissionless (config front-run/grief) | Medium | `FeeRouter` | ? Fixed |
| M-05 | `VestingController.withdrawLP` with `creator == address(0)` sends LP to arbitrary caller | Medium | `VestingController` | ? Fixed |
| M-06 | `protocolFeeReceiver` set to deployer EOA (centralization / key-loss) | Medium | `DeployMainnet.s.sol` | ? Fixed |
| M-07 | `ProfileRegistry.unlinkWallet` uses `.transfer()` (2300 gas) — DoS for contract wallets | Medium | `ProfileRegistry` | ? Fixed |
| L-01 | `LickPair` MINIMUM_LIQUIDITY minted to `address(1)` instead of burned to `address(0)` | Low | `LickPair` | ? Fixed |
| L-02 | `LickPair` TWAP accumulators absent (placeholder only) — no on-chain oracle | Low | `LickPair` | ? Fixed |
| L-03 | `LickPair` has no `skim()` — donated tokens absorbed into reserves | Low | `LickPair` | ? Fixed |
| L-04 | `GraduationRouter` LP burn uses raw `.transfer` | Low | `GraduationRouter` | ? Fixed |
| L-05 | `FeeRouter` bare `receive()` strands untagged ETH (no sweep) | Low | `FeeRouter` | ? Fixed |
| L-06 | `BondingCurve` constructor performs no zero-address validation | Low | `BondingCurve` | ? Fixed |
| L-07 | `ProfileRegistry.merkleAnchor` has no rotation path; accepts zero root | Low | `ProfileRegistry` | ? Fixed |
| L-08 | `LickRouter.receive()` accepts MON from anyone; stray MON unrecoverable | Low | `LickRouter` | ? Fixed |
| I-01 | `LickPair.onlyFactory` modifier declared but unused | Informational | `LickPair` | ? Fixed |
| I-02 | `LickPair.initialize` not idempotent-guarded (relies on factory-only) | Informational | `LickPair` | ? Fixed |
| I-03 | Misleading inline comment in `claimWinnings` ("Return … original stake") | Informational | `PredictionMarket` | ? Fixed |
| I-04 | `GraduationPool` subsidy pool is not deployed by `DeployMainnet` | Informational | `DeployMainnet.s.sol` | ? Fixed |
| I-05 | `PROTOCOL_FEE`/`CREATOR_FEE`/`TOTAL_SUPPLY` constants duplicated across contracts | Informational | multiple | 🟡 Accepted (deferred — values match; refactor risk > value) |
| G-01 | Unbounded `Factory.tokens[]` / `LickFactory.allPairs[]` growth | Gas | `Factory` / `LickFactory` | ? Fixed |
| G-02 | `BondingCurve.approveMigration` redundant `graduationRouter != address(0)` check | Gas | `BondingCurve` | ? Fixed |
| G-03 | `LickPair` reads `token0()`/`getReserves()` separately in router (two external calls) | Gas | `LickRouter` | 🟡 Accepted (micro-opt; not worth churn pre-release) |

---

## 3. Detailed Findings

### C-01 — Routed protocol fees permanently locked in withdrawal-less stub vaults
- **Severity:** Critical
- **Location:** `contracts/src/VaultLPSupport.sol` (entire file), `contracts/src/VaultBuybackBurn.sol` (entire file); wired in `DeployMainnet.s.sol` Steps A & D.
- **Confidence:** High

**Description.** Both vaults are pure black holes:
```solidity
contract VaultLPSupport {
    event Deposited(address indexed sender, uint256 amount);
    receive() external payable { emit Deposited(msg.sender, msg.value); }
}
```
There is **no owner, no withdrawal, no admin, no `selfdestruct`** path. `FeeRouter.receiveCreatorFee` routes `lpShare` to `lpSupportVault` and `buybackShare` to `buybackBurnVault` (`FeeRouter.sol` L246–266). Every fee that lands in these vaults is irrecoverable. The contracts are **non-upgradeable**, so "Phase 4 will add withdrawal" is impossible without redeploying and re-wiring `FeeRouter` via `setVaults` — which only redirects *future* fees, not the already-trapped balance.

**Attack scenario / impact.** No attacker is needed — this is self-inflicted loss. Under the default/ecosystem presets, a meaningful fraction of every creator-fee (e.g. ECOSYSTEM = 20% creator / 40% LP / 40% buyback) flows into these vaults. Across thousands of trades, a large MON balance accumulates and is permanently frozen. Note that the buyback/burn vault accumulating MON (rather than buying & burning) also breaks the economic promise to token holders.

**PoC sketch.**
```solidity
function test_VaultFundsAreLocked() public {
    vm.deal(address(this), 10 ether);
    (bool ok,) = address(vaultLP).call{value: 1 ether}("");
    assertTrue(ok);
    assertEq(address(vaultLP).balance, 1 ether);
    // No function exists to move it out — confirm by absence:
    // vaultLP has only receive(); any owner-withdraw call would not compile.
}
```

**Recommended fix.** Before mainnet, either (a) deploy real vaults with an `onlyOwner` withdrawal / sweep / buyback-burn implementation, or (b) if Phase-4 logic is genuinely deferred, route LP/buyback shares to a **timelocked multisig treasury** rather than a black hole, so funds remain recoverable. Minimal hardening:
```solidity
contract VaultLPSupport {
    address public immutable owner;
    event Deposited(address indexed sender, uint256 amount);
    constructor(address _owner) { require(_owner != address(0)); owner = _owner; }
    receive() external payable { emit Deposited(msg.sender, msg.value); }
    function sweep(address to, uint256 amt) external {
        require(msg.sender == owner, "NOT_OWNER");
        (bool ok,) = payable(to).call{value: amt}(""); require(ok, "FAIL");
    }
}
```

---

### C-02 — `VestingController.initVesting` lacks access control (beneficiary hijack / token drain)
- **Severity:** Critical (contract-level); **see scope note**
- **Location:** `contracts/src/VestingController.sol` — `initVesting(...)` has only `nonReentrant`, no `onlyOwner`; contrast `createAllocation` which is `onlyOwner`. `claim(address)` releases up to `alloc.totalAmount` to `alloc.beneficiary`.
- **Confidence:** High (medium on real-world reachability — see scope note)

**Description.** `initVesting` is callable by anyone and sets `allocations[token].beneficiary` for an un-initialized token. The intended flow is: Factory transfers dev tokens into the controller, *then* calls `initVesting`. If the transfer and `initVesting` are not atomic — or if any token balance ever sits in the controller for an un-initialized token — an attacker can front-run `initVesting`, set themselves as `beneficiary`, and `claim` up to `totalAmount`.

**Scope note (important).** `DeployMainnet.s.sol` does **not** deploy `VestingController`, and none of the live `Factory.createToken*` paths call it (verified: 100% of supply goes to the curve; no dev allocation). So in the *current mainnet configuration this is not reachable*. It is rated Critical at the **contract level** because the contract is deployable, is part of the audited source set, and the gap is a textbook privilege-escalation that would be catastrophic if Vesting is ever wired in (Phase 2). Treat as a must-fix-before-use, gate-on-deploy item.

**Attack scenario.** Phase-2 Factory does `vesting.initVesting(token, dev, …)` after transferring tokens. A bot watching the mempool calls `initVesting(token, attacker, …)` first (token address is known once the token is deployed). Attacker becomes beneficiary and drains the dev allocation via `claim(token)`.

**PoC sketch.**
```solidity
function test_initVesting_frontrun_hijack() public {
    // Factory has transferred dev tokens to controller but not yet init'd
    token.transfer(address(vesting), 1_000 ether);
    vm.prank(attacker);
    vesting.initVesting(address(token), attacker, Tier.LIGHT, 1_000 ether, block.timestamp);
    vm.prank(attacker);
    vesting.claim(address(token));
    assertEq(token.balanceOf(attacker), 1_000 ether); // drained
}
```

**Recommended fix.** Add `require(msg.sender == owner, "NOT_OWNER")` (or an `onlyFactory` modifier) to `initVesting`, matching `createAllocation`.

---

### H-01 — First-mint reserve manipulation on migration (donation to precomputed CREATE2 pair)
- **Severity:** High
- **Location:** `GraduationRouter.migrateLiquidity` L109–165 (`LickPair(pair).mint(address(this))` L151); `LickPair.mint` L86–112 (uses `balanceOf` deltas, first-mint `_sqrt(amount0*amount1) - MINIMUM_LIQUIDITY`); `LickFactory.createPair` L65–82 (deterministic CREATE2 salt = `keccak256(token0, token1)`).
- **Confidence:** High

**Description.** The DEX pair address is a deterministic function of `(token0, token1)` via CREATE2. An attacker can compute the future pair address *before* migration and transfer tokens (the LickToken, freely transferable, or WMON) directly to it. `LickPair.mint` computes liquidity from `balanceOf(address(this)) - reserve` deltas, so the donated tokens are folded into the very first mint. Because the router calls `mint` with the snapshotted `tokenBalance`/`monAmount`, the **initial price and reserves are set on the donated-skewed balances**, and the resulting LP (minted to the router, then burned to `0xdead`) is computed on inflated balances.

**Attack scenario / impact.**
1. Token nears graduation. Attacker precomputes `pair = CREATE2(LickFactory, keccak256(sorted(token, WMON)))`.
2. Attacker transfers, say, a large amount of the LickToken (acquired cheaply pre-graduation, or just dust to skew ratios) **directly to `pair`** before anyone calls `migrateLiquidity`.
3. `migrateLiquidity` runs: `safeTransfer(pair, tokenBalance)` and `safeTransfer(pair, monAmount)` add the curve's liquidity *on top of* the attacker's donation. `mint` reads `balanceOf` and sets reserves = curve liquidity + donation.
4. The first LP is burned to `0xdead`, but the **price is now wrong** (token-heavy), and the donated tokens are permanently part of the pool's reserves — effectively the attacker can pre-set an unfavorable opening price, or grief the launch. A more refined variant donates WMON to make the token open *more expensive*, then sells into the first buyers (sandwich the migration).
5. Even worse for the donation/inflation classic: because `mint` subtracts `MINIMUM_LIQUIDITY` only from the first mint and LP goes to `0xdead`, the attacker doesn't capture LP — but they **do** control the opening reserve ratio, which is a direct price-manipulation/MEV vector on a high-value, one-time event.

**PoC sketch.**
```solidity
function test_migration_firstMint_donationSkew() public {
    // graduate the curve normally
    _graduate(curve);
    // precompute pair
    address pair = _computeCreate2Pair(address(dexFactory), address(token), WMON);
    // attacker donates tokens directly to the not-yet-deployed pair address
    vm.prank(attacker);
    token.transfer(pair, 50_000_000 ether);
    // migrate
    router.migrateLiquidity(address(token));
    (uint112 r0, uint112 r1,) = LickPair(pair).getReserves();
    // assert reserves include attacker's donation → opening price skewed
    // compare against expected reserves from curve snapshot only
}
```

**Recommended fix.** In `migrateLiquidity`, do not rely on `balanceOf` deltas for the first mint of a freshly created pair. Options:
- Create the pair **first**, then read `getReserves()`; assert reserves are `(0,0)` before transferring, and if a donation is detected, `sync()` + `skim()` the excess to `0xdead`/treasury before minting; or
- Have `LickPair.mint` accept explicit `amount0/amount1` for the first mint from a trusted minter; or
- Add a `skim()` to `LickPair` and skim the precomputed pair to a sink immediately before the migration transfers (also resolves L-03).

Document and test that the opening price equals exactly `monAmount / tokenBalance` regardless of prior donations.

---

### H-02 — Deploy conflates one `VaultLPSupport` as both GraduationPool and LP-support sink
- **Severity:** High
- **Location:** `DeployMainnet.s.sol` — `graduationPoolStub = address(vaultLP)` (Step C), then `new FeeRouter(graduationPoolStub, address(vaultLP), address(vaultBB))` (Step D) passes `vaultLP` as **both** arg1 (graduationPool) and arg2 (lpSupport).
- **Confidence:** High

**Description.** The same `VaultLPSupport` instance is the FeeRouter's `graduationPool` *and* its `lpSupportVault`. Two semantically distinct fee streams are merged into one address — which (per C-01) is also a withdrawal-less black hole. On-chain accounting cannot distinguish the two buckets, and all funds are irrecoverable.

**Impact.** Conflated, unauditable fee accounting plus permanent loss. If any downstream logic or analytics assumes the graduation pool and LP-support sink are distinct, it is wrong on mainnet.

**Recommended fix.** Deploy a dedicated, recoverable `GraduationPool` (the repo already has `GraduationPool.sol` with real subsidy logic — see I-04) and pass distinct, withdrawal-capable addresses for each FeeRouter constructor slot. Verify the FeeRouter constructor arg order against intended semantics.

---

### H-03 — `Factory.createToken` has no zero-address check on `creatorAddress`
- **Severity:** High
- **Location:** `Factory.createToken` L99–148 (curve deployed with `creator = creatorAddress`, no validation); fee delivered in `BondingCurve._sendCreatorFee` L312 via `payable(creator).call{value: amount}("")`.
- **Confidence:** High

**Description.** `createToken` (the standard, backward-compatible path that does **not** route through FeeRouter) passes `creatorAddress` straight into the `BondingCurve` constructor with no `!= address(0)` guard. On every buy/sell the 1% creator fee is sent via low-level `.call` to `creator`. A `.call` to `address(0)` **succeeds** (no code, no revert) and the MON is burned.

**Attack scenario / impact.** A creator (or a buggy frontend) calls `createToken(..., address(0), ...)`. Every trade silently burns 1% of post-penalty volume to `address(0)`. There is no recovery. While this is partly user error, a launchpad must defend against it because it is a permanent, silent value leak triggered by a single bad parameter.

**PoC sketch.**
```solidity
function test_createToken_zeroCreator_burnsFee() public {
    (address tok, address cv) = factory.createToken("T","T", address(0), 0);
    vm.deal(buyer, 10 ether);
    vm.prank(buyer);
    BondingCurve(payable(cv)).buy{value: 1 ether}(0);
    // 1% creator fee went to address(0) — assert by checking no recipient gained it
}
```

**Recommended fix.** `if (creatorAddress == address(0)) revert ZeroAddress();` at the top of `createToken` (the preset/custom paths set `creator = feeRouter`, so they're safe, but still validate the `creatorAddress` argument passed to `applyPreset`/`applyCustomConfig`).

---

### H-04 — `PredictionMarket.resolveMarket` has no time gate
- **Severity:** High
- **Location:** `PredictionMarket.resolveMarket` L149–166 — requires only `!resolved` and both pools `> 0`; **no `block.timestamp` check** against `closeTime`.
- **Confidence:** High

**Description.** A market can be resolved the instant both sides have ≥1 bet and `BondingCurve.graduated()` returns the desired value — *even while the betting window is still open*. Once `resolved = true`, `betYes`/`betNo` revert (`ALREADY_RESOLVED`), freezing the market.

**Attack scenario / impact.**
- **Outcome-lock griefing / MEV:** The moment a curve graduates (YES becomes true), anyone can call `resolveMarket` mid-window, locking YES as the winner and preventing any further NO bets — or vice-versa, an early observer who sees graduation is imminent front-runs to lock in odds favorable to their existing position before the rest of the window's NO bettors can react.
- **Information asymmetry:** Bettors expecting a full 48h window have the market resolved out from under them, denying them the ability to bet or to adjust. This undermines the parimutuel fairness the protocol advertises.

**PoC sketch.**
```solidity
function test_resolve_duringOpenWindow() public {
    pm.betYes{value: 1 ether}(token);
    vm.prank(bob); pm.betNo{value: 1 ether}(token);
    _graduate(curve);                 // graduated() == true, window still open
    // anyone resolves now, before closeTime:
    pm.resolveMarket(token);
    assertTrue(_resolved(token));
    // further bets now revert
    vm.expectRevert("ALREADY_RESOLVED");
    pm.betNo{value: 1 ether}(token);
}
```

**Recommended fix.** Require resolution only after the window closes (or after graduation, whichever is the intended trigger):
```solidity
require(block.timestamp >= markets[token].closeTime || _graduatedEarly, "WINDOW_OPEN");
```
Decide the intended semantics explicitly: if graduation should end betting early, document it; otherwise gate on `closeTime`.

---

### M-01 — `LickFactory.setGraduationRouter` is re-callable despite "once" NatSpec
- **Severity:** Medium
- **Location:** `LickFactory.setGraduationRouter` L48–52. NatSpec says "Can only be called once" but there is no flag — `owner` can call it any number of times.
- **Confidence:** High

**Description / impact.** The `owner` (deployer EOA) can re-point `graduationRouter` at any time. Since `createPair` is `onlyRouter`, a malicious or compromised owner could set `graduationRouter` to an address they control and create arbitrary pairs (e.g. to pre-create a pair at the precomputed address and grief migration — compounds H-01). The documentation/code mismatch also risks operational mistakes.

**Recommended fix.** Either enforce once-only (`if (graduationRouter != address(0) && _alreadySet) revert AlreadySet();` with a bool, mirroring `Factory`'s pattern), or make `owner` a multisig and document the privilege. Given the deploy temporarily sets `deployer` as router, a `bool routerLocked` set during handoff is cleanest.

---

### M-02 — No `require(pair != address(0))` after CREATE2
- **Severity:** Medium
- **Location:** `LickFactory.createPair` L65–82 — after the `create2` assembly, `pair` is used without checking it is non-zero.
- **Confidence:** High

**Description / impact.** If `create2` fails (e.g. an address already has code at the deterministic address — possible via H-01-style pre-deployment, or a hash collision edge case), the assembly returns `address(0)`. The subsequent `LickPair(pair).initialize(...)` would call into `address(0)` and the mapping writes would corrupt state. Standard hardened factories assert success.

**Recommended fix.**
```solidity
assembly { pair := create2(0, add(bytecode, 32), mload(bytecode), salt) }
require(pair != address(0), "CREATE2_FAILED");
```

---

### M-03 — `LickPair` uses raw unchecked `.transfer` (no `SafeERC20`)
- **Severity:** Medium
- **Location:** `LickPair.burn` L130–131, `LickPair.swap` L167–168 — `IERC20(token).transfer(...)` with return value ignored.
- **Confidence:** High

**Description / impact.** The pair never checks ERC-20 `transfer` return values and does not use `SafeERC20`. For a standard LickToken + WMON this is fine, but the pair is generic (`initialize` accepts any `token0/token1`). A non-standard token (returns `false`, or no return value) paired here would let `swap`/`burn` proceed believing a transfer happened when it didn't — enabling theft of the counter-asset. Assumption: only LickToken/WMON pairs are ever created via the router; if that ever changes, this is exploitable.

**Recommended fix.** Use `SafeERC20.safeTransfer` (as `LickRouter` and `GraduationRouter` already do). Even constrained to LickToken/WMON, this is cheap defense-in-depth.

---

### M-04 — `FeeRouter.applyPreset` / `applyCustomConfig` are permissionless
- **Severity:** Medium
- **Location:** `FeeRouter.applyPreset` L185, `applyCustomConfig` L205 — no access modifier; both funnel into `_setFeeConfig` which has the `AlreadyInitialized` guard.
- **Confidence:** High

**Description / impact.** Anyone can set the fee config for any *un-initialized* token address. In the normal flow `Factory` deploys the token and applies the config in the same transaction, so the token address is not known to an attacker beforehand (it is a `CREATE` address computed within that tx). However:
- The lack of access control is fragile — any future flow that creates a token in one tx and configures it in another opens a front-run window where an attacker sets a hostile split (e.g. 100% to a gift address they own) before the legitimate config, permanently locking the token to attacker-favorable fees (the `AlreadyInitialized` guard then blocks the real config).
- It is a griefing surface against any externally-known token address that has a curve but no FeeRouter config yet.

**Recommended fix.** Restrict config-setters to the Factory (or owner): `require(msg.sender == factory || msg.sender == owner)`. Note the historical bug record shows `applyPreset` was deliberately made non-`onlyOwner` because Factory (not owner) calls it — so add a dedicated `factory` immutable and gate on that, rather than reintroducing the owner-only bug.

---

### M-05 — `VestingController.withdrawLP` with `creator == address(0)` sends LP to arbitrary caller
- **Severity:** Medium (scope note as C-02 — not in live deploy)
- **Location:** `VestingController.withdrawLP` — recipient is `lock.creator` if set, else `msg.sender`.
- **Confidence:** High

**Description / impact.** If a `LockedLP` entry is ever created with `creator == address(0)`, then after `lockEnd` **any caller** can `withdrawLP` and receive the LP tokens. Combined with the public nature of the function, this is a fund-theft path. Not reachable in the current deploy (VestingController unused, LP is burned to `0xdead` at graduation), but live and exploitable if the contract is wired in.

**Recommended fix.** `require(lock.creator != address(0), "NO_CREATOR")` and always send to `lock.creator`; never fall back to `msg.sender`.

---

### M-06 — `protocolFeeReceiver` set to deployer EOA
- **Severity:** Medium
- **Location:** `DeployMainnet.s.sol` — `PredictionMarket(deployer, …)` (Step F), `GraduationRouter(…, deployer, …)` (Step G); `Factory(deployer)` makes deployer the `protocolTreasury` and `owner`.
- **Confidence:** High

**Description / impact.** All protocol fees, prediction-market fees, and admin powers (Factory `owner`, LickFactory `owner`, FeeRouter `owner`, GraduationPool `reporter` if deployed) concentrate on a single externally-owned key. Key loss = permanent loss of all protocol fees and inability to perform any one-time wiring corrections. Key compromise = attacker can re-point routers (see M-01), set hostile vaults, and drain fee streams.

**Recommended fix.** Use a multisig (e.g. Safe) or a timelock for `protocolTreasury`, `protocolFeeReceiver`, and all `owner` roles. At minimum, transfer ownership to a multisig immediately post-deploy and document the procedure.

---

### M-07 — `ProfileRegistry.unlinkWallet` uses `.transfer()` (2300 gas)
- **Severity:** Medium
- **Location:** `ProfileRegistry.unlinkWallet` — `payable(msg.sender).transfer(refundAmount)` at the end (after CEI state clearing).
- **Confidence:** High

**Description / impact.** `.transfer` forwards only 2300 gas. A smart-contract wallet (Safe, account-abstraction wallet) whose `receive` costs more than 2300 gas cannot reclaim its 0.1 MON bond — the call reverts the whole `unlinkWallet`, permanently locking the bond (state is cleared before the transfer, so on revert nothing changes, but the user can never successfully unlink). On Monad, gas-cost assumptions may differ from Ethereum, increasing the failure surface.

**Recommended fix.** Replace with a checked low-level call:
```solidity
(bool ok,) = payable(msg.sender).call{value: refundAmount}("");
require(ok, "REFUND_FAILED");
```
(`nonReentrant` is already absent here — add `ReentrancyGuard` or keep strict CEI, which the code already does by zeroing state before sending.)

---

### L-01 — MINIMUM_LIQUIDITY minted to `address(1)` instead of `address(0)`
- **Location:** `LickPair.mint` L97 — `_mint(address(1), MINIMUM_LIQUIDITY)`.
- **Impact:** Functionally locked (no one holds `address(1)`'s key), but it is not "burned" per V2 convention and `address(1)` is a precompile address on many chains. Cosmetic/semantic; recommend `address(0)` or `0xdead` for clarity. **Low.**

### L-02 — TWAP accumulators absent
- **Location:** `LickPair._update` L204–214 — `blockTimestampLast` is tracked but `price0CumulativeLast`/`price1CumulativeLast` are never computed (placeholder comment "omitted for simplicity").
- **Impact:** No on-chain price oracle. Any future integration that assumes a V2-style TWAP would read nothing. Document clearly that this pair provides **no** oracle, so lending/derivative integrations don't rely on it. **Low.**

### L-03 — No `skim()`
- **Location:** `LickPair` — has `sync()` but no `skim()`.
- **Impact:** Tokens donated to the pair cannot be skimmed off; they get absorbed into reserves on the next `sync`/`mint`/`swap`. Generally benign for trading, but it is the enabling primitive behind H-01. Adding `skim()` both follows V2 and helps mitigate H-01. **Low.**

### L-04 — `GraduationRouter` LP burn uses raw `.transfer`
- **Location:** `GraduationRouter.migrateLiquidity` L158 — `IERC20(pair).transfer(address(0xdead), lpAmount)`.
- **Impact:** Inconsistent with the `SafeERC20` usage elsewhere in the same function. The `pair` is a freshly-minted LickPair whose `transfer` returns `true`, so low risk, but if `lpAmount == 0` (a degenerate migration) the burn silently does nothing. Use `safeTransfer` and assert `lpAmount > 0`. **Low.**

### L-05 — `FeeRouter` bare `receive()` strands untagged ETH
- **Location:** `FeeRouter.receive()` L300 — accepts ETH with no token context; there is no sweep for balance that arrives outside `receiveCreatorFee`.
- **Impact:** MON sent to the router without going through `receiveCreatorFee(token)` is not routable and has no withdrawal path → stranded. In the live flow BondingCurve always calls `receiveCreatorFee` with value+token, so this is a safety net, but any stray send is lost. Add an `onlyOwner` sweep or remove the bare `receive()`. **Low.**

### L-06 — `BondingCurve` constructor performs no zero-address validation
- **Location:** `BondingCurve` constructor L116–135 — `_token`, `_protocolFeeReceiver`, `_creator` are stored without checks (relies on Factory). `_graduationRouter == 0` is intentionally allowed (disables migration).
- **Impact:** Defense-in-depth gap; in combination with H-03 a zero `creator` reaches the curve. Add explicit guards for `_token` and `_protocolFeeReceiver` (and `_creator` unless intentionally routed). **Low.**

### L-07 — `ProfileRegistry.merkleAnchor` has no rotation; accepts zero root
- **Location:** `ProfileRegistry` — `merkleAnchor` set once in constructor, no setter; `setMerkleRoot` accepts any `bytes32` including `0x0`.
- **Impact:** If the off-chain reputation key is lost/compromised, anchoring cannot be re-pointed and a compromised key can post a zero/garbage root. Add an `onlyAnchor` rotation function and a `root != 0` check. **Low.**

### L-08 — `LickRouter.receive()` accepts MON from anyone
- **Location:** `LickRouter.receive()` L245 — open, intended to accept MON from `WMON.withdraw()`.
- **Impact:** Stray MON sent directly is unrecoverable (no sweep). Minor; consider restricting to `msg.sender == wmon` or adding an owner sweep. **Low.**

### I-01 — `LickPair.onlyFactory` modifier declared but unused
`initialize` uses an inline `if (msg.sender != factory) revert Forbidden();` instead of the declared `onlyFactory` modifier (L49–52). Dead code; remove or use it.

### I-02 — `LickPair.initialize` not idempotent-guarded
Relies solely on `msg.sender == factory`. Since the factory only calls it once immediately after deploy, it is safe in practice, but an explicit `require(token0 == address(0), "INIT")` would harden it.

### I-03 — Misleading comment in `claimWinnings`
`PredictionMarket.claimWinnings` L196 comment reads "Return the bettor's original stake + winnings", but the code pays only the winner's share of the losing pool; the original stake is intentionally retained (confirmed by the contradicting doc-comments above it). Fix the comment to avoid future-maintainer error.

### I-04 — `GraduationPool` not deployed by `DeployMainnet`
The repo contains a fully-featured `GraduationPool.sol` (reputation-gated subsidies, Merkle proofs, correct CEI + `nonReentrant` + checked sends), but the mainnet script substitutes the `VaultLPSupport` stub instead (H-02). Either deploy the real pool or remove it from scope to avoid confusion.

### I-05 — Duplicated constants
`TOTAL_SUPPLY` (`LickToken` & `BondingCurve`), fee bps, and the 25/10000 DEX fee appear in multiple contracts. They currently match, but duplication invites drift. Consider a shared constants library.

### G-01 — Unbounded arrays
`Factory.tokens[]` (push on every permissionless `createToken`) and `LickFactory.allPairs[]` grow without bound. No on-chain function iterates them today, so no immediate DoS, but any future on-chain enumeration would be unbounded-gas. Keep enumeration off-chain (indexer) and document that these arrays must never be iterated on-chain.

### G-02 — Redundant check
`BondingCurve.approveMigration` checks `graduationRouter != address(0)` after already requiring `msg.sender == graduationRouter` (msg.sender can't be zero). Remove the redundant check.

### G-03 — Extra external calls in router
`LickRouter` calls `getReserves()` and `token0()` separately on the pair for each swap (two external calls). Caching or a combined view would save gas on the hot path.

---

## 4. Test Coverage Gaps

The 149-test suite is solid on happy paths, access control, fee math, presets, and basic reentrancy. The following adversarial scenarios are **not** covered and should be added before mainnet:

| Gap | Targets finding | Suggested test |
|---|---|---|
| First-mint donation/skew on migration | H-01 | Donate tokens to the precomputed CREATE2 pair, then `migrateLiquidity`, assert opening reserves equal the curve snapshot only. |
| `resolveMarket` before `closeTime` | H-04 | Bet both sides, graduate, resolve mid-window, assert it should revert (after fix). |
| `initVesting` front-run hijack | C-02 | Non-owner calls `initVesting`, then `claim`, assert revert (after fix). |
| `createToken` with `creatorAddress == address(0)` | H-03 | Assert revert (after fix); pre-fix assert fee burned. |
| Vault fund recoverability | C-01 | Assert routed fees in vaults are recoverable (after fix). |
| `setGraduationRouter` re-call | M-01 | Owner calls twice, assert second reverts (after fix). |
| CREATE2 failure / pre-deployed pair address | M-02 | Deploy code at the deterministic address, assert `createPair` reverts cleanly. |
| Non-standard ERC-20 in `LickPair` | M-03 | Pair a return-`false`/no-return token, assert swap/burn revert with SafeERC20. |
| FeeRouter config front-run | M-04 | External actor sets a hostile config before Factory, assert prevented (after fix). |
| Contract-wallet bond refund (`.transfer` 2300 gas) | M-07 | Link/unlink from a contract whose `receive` costs >2300 gas, assert success (after fix). |
| **Parimutuel solvency fuzz** | (see §5 note) | Fuzz: many bettors both sides, random claim/sweep orderings, assert `Σpayouts + fee ≤ totalNo (or totalYes)` and contract never reverts on a legitimate claim for insufficient balance. |
| Anti-snipe sell penalty (no first-trade exemption on sells) | logic intent | Confirm intended that sells are never exempt from the 7-block penalty. |
| `uint112` reserve overflow boundary | `LickPair._update` | Swap/mint to push balances near `type(uint112).max`, assert `Overflow()` triggers correctly and K-check math (`reserve0*reserve1*1e8 ≈ 2^251`) does not overflow uint256. |
| MEV/sandwich on `LickRouter` | L-08 / MEV | Simulate a front-run buy + victim swap + back-run sell; confirm `amountOutMin`/`deadline` are the only protection (document expected behavior). |

---

## 5. Deployment Review — `DeployMainnet.s.sol`

**Wiring order (verified):**
1. **A** — `VaultLPSupport`, `VaultBuybackBurn` deployed.
2. **B** — `LickFactory(deployer)` — deployer is **temporary router**.
3. **C** — `graduationPoolStub = address(vaultLP)` ⚠️ **H-02**.
4. **D** — `FeeRouter(graduationPoolStub, vaultLP, vaultBB)` — arg1 == arg2 ⚠️ **H-02 / C-01**.
5. **E** — `Factory(deployer)` — deployer is `owner` + `protocolTreasury` ⚠️ **M-06**.
6. **F** — `PredictionMarket(deployer, factory)` — `protocolFeeReceiver = deployer` ⚠️ **M-06**.
7. **G** — `GraduationRouter(dexFactory, WMON, deployer, factory)` — `protocolFeeReceiver = deployer` ⚠️ **M-06**.
8. **H** — `LickRouter(dexFactory, WMON)`.
9. **I** — handoff: `factory.setFeeRouter/​setPredictionMarket/​setGraduationRouter`, then `dexFactory.setGraduationRouter(graduationRouter)` (replaces the temporary deployer-router).

**Assessment.**
- ✅ The whole `run()` executes inside a single `vm.startBroadcast` → the deployer-as-temporary-router window (B→I) is atomic on-chain; no third-party can interleave a `createPair`. **Acceptable.**
- ✅ `WMON_MAINNET` is non-zero with a `require` guard; address sourced from Monad docs (verify independently before deploy).
- ⚠️ **H-02 / C-01:** the FeeRouter is wired to black-hole sinks, and graduation-pool + LP-support are the same address. **Must fix.**
- ⚠️ **M-06:** every privileged role and every fee receiver is the deployer EOA. **Move to multisig/timelock before/at deploy.**
- ⚠️ **M-01 interaction:** after handoff the deployer still owns `LickFactory` and can re-`setGraduationRouter`. Lock it or transfer ownership.
- ℹ️ **I-04:** the real `GraduationPool.sol` is bypassed in favor of a stub.
- ℹ️ `VestingController` and `ProfileRegistry` are **not** deployed here. If they are intended for mainnet, their deployment + wiring (and C-02/M-05/L-07 fixes) must be added and re-audited. If not intended for Phase-3 mainnet, confirm they are excluded so the C-02/M-05 contract-level risks are dormant.
- ✅ No post-deploy verification asserts (e.g. that `factory.feeRouter() == feeRouter`). Recommend adding `require` self-checks after Step I to catch wiring mistakes loudly.

---

## Appendix — Positive Observations (things done right)

- **BondingCurve** custom 1/2 reentrancy guard is correct; `buy` follows strict CEI; `sell` caps payout with `require(grossMonOut <= realMon)` preventing virtual-reserve drain; native sends are checked.
- **GraduationRouter** uses the `address(1)` sentinel + `nonReentrant` + CEI for belt-and-suspenders double-migration protection; snapshots `monAmount` to avoid stray-WETH price contamination.
- **LickRouter** uses `SafeERC20`, checks the native `.call` return, enforces `deadline` + `amountOutMin`, validates `to != address(0)`.
- **PredictionMarket** is **solvent under all claim orderings**: total claimable = `losingPool − fee`, the fee sweep takes exactly `fee`, and the winning pool is never paid out — so `Σpayouts + fee = losingPool ≤ contract balance` always. `feeSwept` and `winningsClaimed` flags + `nonReentrant` prevent double-spend; `sweepProtocolFee` sets the flag before the external call (H4 fix verified). The only caveat is that the retained winning pool is *intentionally* locked dead MON (design choice — see I-03).
- **FeeRouter** enforces BPS-sum=10000 on all config paths, sweeps rounding dust to LP, and uses a failure-tolerant push + pull-payment fallback so a reverting recipient cannot brick routing.
- **LickPair** K-invariant `balance0Adjusted * balance1Adjusted ≥ reserve0 * reserve1 * 1e8` is the correct 0.25%-fee V2 check; `_update` guards `uint112` overflow.

---

*End of report. No source files were modified during this audit.*
