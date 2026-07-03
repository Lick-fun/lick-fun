// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

/// @title VaultRecouper
/// @notice Tiny permissionless helper that re-attributes stranded MON in the
///         VaultBuybackBurn / VaultLPSupport contracts to a specific token.
///
/// @dev Why this exists:
///      The currently-deployed FeeRouter predates the audit fix that switched
///      from `vault.call{value: share}("")` (raw send, bypasses per-token mapping)
///      to `vault.receiveForToken(token)` (correct attribution). The Factory's
///      `feeRouter` and each BondingCurve's `feeRouter` are both set-once, so
///      the v1 raw-send path is permanent for every existing curve.
///
///      Result: `pendingBurn[token]` / `pendingLP[token]` is always 0, but
///      the vault's aggregate MON balance keeps growing on every trade. The
///      vault's `execute()` requires the per-token mapping to be ≥ threshold,
///      so the keeper can never trigger a buyback/burn or LP add.
///
/// What this contract fixes (one-shot, no owner key required):
///      Anyone (e.g. the keeper) sends MON into this contract, picks a token
///      and amount, and we:
///        1. Forward the MON to the vault via `receiveForToken(token)` — which
///           correctly populates the per-token mapping.
///        2. Permissionless + safe — the caller could have just called
///           `receiveForToken` directly. This wrapper is a single-call convenience
///           that also exists so the keeper can re-attribute without holding MON
///           (it forwards from msg.value, accounting exactly).
///
/// Multi-step usage (called by the multisig, or a one-shot script the operator
/// runs from a hot wallet with the multisig's blessing):
///      1. Multisig calls `VaultBuybackBurn.sweep(multisig, X MON)` to pull
///         the stranded balance out.
///      2. Multisig calls `VaultRecouper.recover{value: X MON}(vault, token)` —
///         which forwards to the vault with the correct token attribution.
///
/// Or — even better — if the keeper is funded with a small MON gas reserve, the
/// keeper can call `recover{value: 0}()` (i.e. zero-value) is not allowed; you
/// must forward at least the amount you want to attribute. So in practice the
/// keeper can only do this if it has been pre-funded with MON equal to the
/// stranded amount. For the initial unblock, the multisig does steps 1+2
/// atomically, then the system is permanently self-healing.
contract VaultRecouper {
    /// @notice Forward `msg.value` MON to `vault` and attribute it to `token`
    ///         via the vault's standard `receiveForToken(token)` entrypoint.
    /// @dev    `vault` must be a VaultBuybackBurn or VaultLPSupport instance.
    ///         The function is intentionally minimal: no owner, no admin,
    ///         no pausing, no upgradeability. The caller is the source of
    ///         funds and could equivalently call `receiveForToken` themselves.
    /// @param  vault   The vault contract (VaultBuybackBurn or VaultLPSupport).
    /// @param  token   The LickToken to attribute `msg.value` to.
    function recover(address payable vault, address token) external payable {
        require(msg.value > 0, "ZERO_VALUE");
        require(vault != address(0), "ZERO_VAULT");
        require(token != address(0), "ZERO_TOKEN");
        (bool ok, ) = vault.call{value: msg.value}(
            abi.encodeWithSignature("receiveForToken(address)", token)
        );
        require(ok, "VAULT_REJECTED");
    }

    /// @notice Allow this contract to receive MON (in case someone sends
    ///         directly to it without going through `recover`). The only way
    ///         to drain it is `recover()` with the matching value, so this
    ///         is safe — no funds can be stuck here.
    receive() external payable {}
}
