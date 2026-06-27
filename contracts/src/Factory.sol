// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.27;

import "./LickToken.sol";
import "./BondingCurve.sol";
import "./FeeRouter.sol";
import "./PredictionMarket.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title Factory
 * @notice Deploys LickToken + BondingCurve pairs for the Lick.fun launchpad
 * @dev Supports optional FeeRouter integration for fee splitting presets.
 *      Backward-compatible: existing createToken continues to work unchanged.
 *      100% of token supply goes to the BondingCurve — no auto dev allocation.
 *      Creators buy their own tokens via BondingCurve.buy() (dev pre-buy).
 */
contract Factory {
    // ─── State ───────────────────────────────────────────────────────────────
    address public owner;
    address public immutable protocolTreasury;
    address payable public feeRouter;
    address payable public predictionMarket;
    address public graduationRouter;

    struct TokenInfo {
        address token;
        address curve;
        address creator;
        uint256 createdAt;
    }

    /// @dev NOTE (audit G-01): `tokens` grows unbounded with every createToken.
    ///      It must NEVER be iterated on-chain — enumeration is for off-chain indexers only.
    TokenInfo[] public tokens;
    mapping(address => address) public tokenToCurve;

    // ─── Events ──────────────────────────────────────────────────────────────
    event TokenCreated(address indexed token, address indexed curve, address indexed creator);
    event FeeRouterSet(address indexed feeRouter);
    event PredictionMarketSet(address indexed predictionMarket);
    event GraduationRouterSet(address indexed graduationRouter);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // ─── Errors ──────────────────────────────────────────────────────────────
    error ZeroAddress();
    error NotOwner();
    error AlreadySet();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address _protocolTreasury) {
        if (_protocolTreasury == address(0)) revert ZeroAddress();
        protocolTreasury = _protocolTreasury;
        owner = msg.sender;
    }

    /**
     * @notice Transfer ownership (admin role) to a new address, e.g. a multisig/timelock.
     * @dev Used post-deploy to move admin off the deployer EOA (audit M-06).
     */
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    /**
     * @notice Sets the FeeRouter address. Can only be called once.
     * @param _feeRouter The FeeRouter contract address
     */
    function setFeeRouter(address _feeRouter) external onlyOwner {
        if (feeRouter != address(0)) revert AlreadySet();
        if (_feeRouter == address(0)) revert ZeroAddress();
        feeRouter = payable(_feeRouter);
        emit FeeRouterSet(_feeRouter);
    }

    /**
     * @notice Sets the PredictionMarket address. Can only be called once.
     * @param _predictionMarket The PredictionMarket contract address
     */
    function setPredictionMarket(address _predictionMarket) external onlyOwner {
        if (predictionMarket != address(0)) revert AlreadySet();
        if (_predictionMarket == address(0)) revert ZeroAddress();
        predictionMarket = payable(_predictionMarket);
        emit PredictionMarketSet(_predictionMarket);
    }

    /**
     * @notice Sets the GraduationRouter address. Can only be called once.
     * @param _graduationRouter The GraduationRouter contract address
     */
    function setGraduationRouter(address _graduationRouter) external onlyOwner {
        if (graduationRouter != address(0)) revert AlreadySet();
        if (_graduationRouter == address(0)) revert ZeroAddress();
        graduationRouter = _graduationRouter;
        emit GraduationRouterSet(_graduationRouter);
    }

    /**
     * @notice Creates a new LickToken + BondingCurve pair (standard mode)
     * @param name Token name
     * @param symbol Token symbol
     * @param creatorAddress Creator wallet (receives 1% creator fee)
     * @param startTime Anti-snipe start time (0 = now)
     * @return tokenAddr The new LickToken address
     * @return curveAddr The new BondingCurve address
     * @dev Creator fees go directly to creatorAddress. Backward-compatible.
     */
    function createToken(
        string calldata name,
        string calldata symbol,
        address creatorAddress,
        uint256 startTime
    ) external returns (address tokenAddr, address curveAddr) {
        if (creatorAddress == address(0)) revert ZeroAddress(); // audit H-03
        uint256 st = startTime == 0 ? block.timestamp : startTime;

        // Deploy token
        LickToken tok = new LickToken(name, symbol);
        tokenAddr = address(tok);

        // Deploy curve: (token, protocolFeeReceiver, creator, startTime, graduationRouter)
        BondingCurve curve = new BondingCurve(
            tokenAddr,
            protocolTreasury,
            creatorAddress,
            st,
            graduationRouter
        );
        curveAddr = address(curve);

        // Transfer 100% of supply to the curve — no auto dev allocation.
        // Creator buys their own tokens via BondingCurve.buy() (dev pre-buy).
        tok.transfer(curveAddr, tok.totalSupply());

        // Create prediction market if predictionMarket is configured (C1 fix)
        if (predictionMarket != address(0)) {
            PredictionMarket(predictionMarket).createMarket(tokenAddr, curveAddr);
        }

        tokenToCurve[tokenAddr] = curveAddr;
        tokens.push(TokenInfo({
            token: tokenAddr,
            curve: curveAddr,
            creator: creatorAddress,
            createdAt: block.timestamp
        }));

        emit TokenCreated(tokenAddr, curveAddr, creatorAddress);
    }

    /**
     * @notice Creates a new LickToken + BondingCurve pair with a fee preset
     * @param name Token name
     * @param symbol Token symbol
     * @param creatorAddress Creator wallet
     * @param startTime Anti-snipe start time (0 = now)
     * @param preset FeeRouter preset (DEFAULT or ECOSYSTEM)
     * @return tokenAddr The new LickToken address
     * @return curveAddr The new BondingCurve address
     * @dev Routes creator fees through FeeRouter with the specified preset.
     *      Requires feeRouter to be set first.
     */
    function createTokenWithPreset(
        string calldata name,
        string calldata symbol,
        address creatorAddress,
        uint256 startTime,
        FeeRouter.Preset preset
    ) external returns (address tokenAddr, address curveAddr) {
        if (feeRouter == address(0)) revert ZeroAddress();
        if (creatorAddress == address(0)) revert ZeroAddress(); // audit H-03
        uint256 st = startTime == 0 ? block.timestamp : startTime;

        // Deploy token
        LickToken tok = new LickToken(name, symbol);
        tokenAddr = address(tok);

        // Deploy curve with creator = feeRouter (fees flow through FeeRouter)
        BondingCurve curve = new BondingCurve(
            tokenAddr,
            protocolTreasury,
            feeRouter,
            st,
            graduationRouter
        );
        curveAddr = address(curve);

        // Transfer 100% of supply to the curve — no auto dev allocation.
        tok.transfer(curveAddr, tok.totalSupply());

        // Set feeRouter on BondingCurve so creator fees route through FeeRouter (H1 fix)
        curve.setFeeRouter(feeRouter);

        // Create prediction market if predictionMarket is configured (C1 fix)
        if (predictionMarket != address(0)) {
            PredictionMarket(predictionMarket).createMarket(tokenAddr, curveAddr);
        }

        tokenToCurve[tokenAddr] = curveAddr;
        tokens.push(TokenInfo({
            token: tokenAddr,
            curve: curveAddr,
            creator: creatorAddress,
            createdAt: block.timestamp
        }));

        // Apply the preset fee config
        FeeRouter(feeRouter).applyPreset(tokenAddr, creatorAddress, preset);

        emit TokenCreated(tokenAddr, curveAddr, creatorAddress);
    }

    /**
     * @notice Creates a new LickToken + BondingCurve pair with a fully custom fee config.
     * @param name Token name
     * @param symbol Token symbol
     * @param creatorAddress Creator wallet
     * @param startTime Anti-snipe start time (0 = now)
     * @param creatorShareBps Creator's cut of the 1% creator fee (in bps, e.g. 1000 = 10%)
     * @param lpSupportBps LP support vault cut (bps)
     * @param buybackBurnBps Buyback & burn vault cut (bps)
     * @param giftBps Gift recipient cut (bps, 0 if unused)
     * @param giftRecipient Gift recipient address (address(0) if giftBps == 0)
     * @return tokenAddr The new LickToken address
     * @return curveAddr The new BondingCurve address
     * @dev All four bps values must sum to 10000. Reverts if feeRouter is not set.
     */
    function createTokenWithCustomConfig(
        string calldata name,
        string calldata symbol,
        address creatorAddress,
        uint256 startTime,
        uint256 creatorShareBps,
        uint256 lpSupportBps,
        uint256 buybackBurnBps,
        uint256 giftBps,
        address giftRecipient
    ) external returns (address tokenAddr, address curveAddr) {
        if (feeRouter == address(0)) revert ZeroAddress();
        if (creatorAddress == address(0)) revert ZeroAddress(); // audit H-03
        uint256 st = startTime == 0 ? block.timestamp : startTime;

        // Deploy token
        LickToken tok = new LickToken(name, symbol);
        tokenAddr = address(tok);

        // Deploy curve with creator = feeRouter (fees flow through FeeRouter)
        BondingCurve curve = new BondingCurve(
            tokenAddr,
            protocolTreasury,
            feeRouter,
            st,
            graduationRouter
        );
        curveAddr = address(curve);

        // Transfer 100% of supply to the curve
        tok.transfer(curveAddr, tok.totalSupply());

        // Set feeRouter on BondingCurve so creator fees route through FeeRouter
        curve.setFeeRouter(feeRouter);

        // Create prediction market if configured
        if (predictionMarket != address(0)) {
            PredictionMarket(predictionMarket).createMarket(tokenAddr, curveAddr);
        }

        tokenToCurve[tokenAddr] = curveAddr;
        tokens.push(TokenInfo({
            token: tokenAddr,
            curve: curveAddr,
            creator: creatorAddress,
            createdAt: block.timestamp
        }));

        // Apply the custom fee config
        FeeRouter(feeRouter).applyCustomConfig(
            tokenAddr,
            creatorAddress,
            creatorShareBps,
            lpSupportBps,
            buybackBurnBps,
            giftBps,
            giftRecipient
        );

        emit TokenCreated(tokenAddr, curveAddr, creatorAddress);
    }
}