// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title FeeRouter
 * @notice Routes the 1% creator fee from BondingCurve trades to Fee Vaults
 * @dev Splits incoming MON according to per-token FeeConfig with preset support
 */
contract FeeRouter is ReentrancyGuard {
    // ─── Constants ────────────────────────────────────────────────────────────
    uint256 public constant BPS_DENOM = 10_000;

    // ─── Enums ────────────────────────────────────────────────────────────────
    enum Preset { DEFAULT, ECOSYSTEM }

    // ─── Structs ──────────────────────────────────────────────────────────────
    struct FeeConfig {
        uint256 creatorShareBps; // to creator wallet
        uint256 lpSupportBps;    // to LP support vault
        uint256 buybackBurnBps;  // to buyback & burn vault
        uint256 giftBps;         // to gift vault
        address giftRecipient;   // recipient for gift vault
        address creator;         // actual creator wallet
        bool initialized;
    }

    // ─── State ────────────────────────────────────────────────────────────────
    mapping(address => FeeConfig) public tokenFeeConfigs;
    address public immutable graduationPool;
    address public immutable owner;

    address public lpSupportVault;
    address public buybackBurnVault;

    // ─── Events ───────────────────────────────────────────────────────────────
    event FeeConfigSet(address indexed token, FeeConfig config);
    event FeeRouted(address indexed token, uint256 totalAmount, uint256 creatorShare, uint256 lpShare, uint256 buybackShare, uint256 giftShare);

    // ─── Errors ────────────────────────────────────────────────────────────────
    error AlreadyInitialized();
    error InvalidBps();
    error NotOwner();
    error ZeroAddress();

    constructor(address _graduationPool, address _lpSupportVault, address _buybackBurnVault) {
        if (_graduationPool == address(0)) revert ZeroAddress();
        if (_lpSupportVault == address(0)) revert ZeroAddress();
        if (_buybackBurnVault == address(0)) revert ZeroAddress();
        graduationPool = _graduationPool;
        lpSupportVault = _lpSupportVault;
        buybackBurnVault = _buybackBurnVault;
        owner = msg.sender;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    // ─── Preset Helpers ───────────────────────────────────────────────────────

    /**
     * @notice Returns the fee split config for a given preset
     * @param preset The preset enum value
     * @param creatorAddress The actual creator wallet address
     * @return config The FeeConfig struct
     * @dev DEFAULT: Creator 80% / LP 10% / Buyback&Burn 10%
     *      ECOSYSTEM: Creator 20% / LP 40% / Buyback&Burn 40% (goes to graduationPool)
     */
    function getPresetConfig(Preset preset, address creatorAddress) public pure returns (FeeConfig memory) {
        if (preset == Preset.ECOSYSTEM) {
            return FeeConfig({
                creatorShareBps: 2000,  // 20%
                lpSupportBps: 4000,       // 40%
                buybackBurnBps: 4000,     // 40%
                giftBps: 0,
                giftRecipient: address(0),
                creator: creatorAddress,
                initialized: true
            });
        }
        // DEFAULT
        return FeeConfig({
            creatorShareBps: 8000,   // 80%
            lpSupportBps: 1000,        // 10%
            buybackBurnBps: 1000,      // 10%
            giftBps: 0,
            giftRecipient: address(0),
            creator: creatorAddress,
            initialized: true
        });
    }

    // ─── Configuration ────────────────────────────────────────────────────────

    /**
     * @notice Sets fee config for a token. Can only be called once per token.
     * @param token The token address
     * @param config The fee split configuration
     */
    function setFeeConfig(address token, FeeConfig calldata config) public onlyOwner {
        _setFeeConfig(token, config);
    }

    function _setFeeConfig(address token, FeeConfig memory config) internal {
        if (tokenFeeConfigs[token].initialized) revert AlreadyInitialized();
        if (config.creatorShareBps + config.lpSupportBps + config.buybackBurnBps + config.giftBps != BPS_DENOM) {
            revert InvalidBps();
        }
        if (config.giftBps > 0 && config.giftRecipient == address(0)) revert ZeroAddress();
        tokenFeeConfigs[token] = config;
        emit FeeConfigSet(token, config);
    }

    /**
     * @notice Applies a preset fee config for a token. Convenience for Factory.
     * @param token The token address
     * @param creatorAddress The actual creator wallet
     * @param preset The preset enum value
     */
    function applyPreset(address token, address creatorAddress, Preset preset) external onlyOwner {
        FeeConfig memory config = getPresetConfig(preset, creatorAddress);
        _setFeeConfig(token, config);
    }

    // ─── Fee Collection ───────────────────────────────────────────────────────

    /**
     * @notice Receives the creator fee from BondingCurve and routes to vaults
     * @param token The token address this fee is for
     * @dev Called by BondingCurve when it sends creator fees (BondingCurve sends ETH to
     *      its `creator` address, which is set to this FeeRouter when using presets).
     *      This function can be called by anyone to sweep fees that were sent directly.
     */
    function receiveCreatorFee(address token) external payable nonReentrant {
        FeeConfig memory config = tokenFeeConfigs[token];
        if (!config.initialized) revert InvalidBps();

        uint256 amount = msg.value;
        if (amount == 0) return;

        uint256 creatorShare   = (amount * config.creatorShareBps) / BPS_DENOM;
        uint256 lpShare        = (amount * config.lpSupportBps) / BPS_DENOM;
        uint256 buybackShare   = (amount * config.buybackBurnBps) / BPS_DENOM;
        uint256 giftShare      = (amount * config.giftBps) / BPS_DENOM;

        // Route creator share to actual creator
        if (creatorShare > 0) {
            (bool ok, ) = config.creator.call{value: creatorShare}("");
            require(ok, "Creator transfer failed");
        }

        // Route LP support share
        if (lpShare > 0) {
            (bool ok, ) = lpSupportVault.call{value: lpShare}("");
            require(ok, "LP vault transfer failed");
        }

        // Route buyback & burn share
        if (buybackShare > 0) {
            (bool ok, ) = buybackBurnVault.call{value: buybackShare}("");
            require(ok, "Buyback vault transfer failed");
        }

        // Route gift share
        if (giftShare > 0 && config.giftRecipient != address(0)) {
            (bool ok, ) = config.giftRecipient.call{value: giftShare}("");
            require(ok, "Gift transfer failed");
        }

        emit FeeRouted(token, amount, creatorShare, lpShare, buybackShare, giftShare);
    }

    /**
     * @notice Fallback receive function to accept ETH sent directly from BondingCurve
     * @dev BondingCurve sends creator fees to its `creator` address (this contract).
     *      ETH accumulates here; it must be swept via receiveCreatorFee with the token param.
     *      However, BondingCurve sends ETH directly without specifying the token, so we
     *      cannot route fees automatically. Instead, we use a different approach:
     *      BondingCurve sends to this contract, and the Factory calls receiveCreatorFee
     *      with the token address after the trade. The ETH balance here is swept.
     */
    receive() external payable {}

    // ─── Admin ────────────────────────────────────────────────────────────────

    /**
     * @notice Updates the vault addresses
     * @param _lpSupportVault New LP support vault address
     * @param _buybackBurnVault New buyback & burn vault address
     */
    function setVaults(address _lpSupportVault, address _buybackBurnVault) external onlyOwner {
        if (_lpSupportVault == address(0)) revert ZeroAddress();
        if (_buybackBurnVault == address(0)) revert ZeroAddress();
        lpSupportVault = _lpSupportVault;
        buybackBurnVault = _buybackBurnVault;
    }
}