// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.27;

import "./LickToken.sol";
import "./BondingCurve.sol";
import "./FeeRouter.sol";
import "./PredictionMarket.sol";
import "./VestingController.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title Factory
 * @notice Deploys LickToken + BondingCurve pairs for the Lick.fun launchpad
 * @dev Supports optional FeeRouter integration for fee splitting presets.
 *      Backward-compatible: existing createToken continues to work unchanged.
 */
contract Factory {
    // ─── Constants ───────────────────────────────────────────────────────────
    /// @notice Dev allocation in basis points (10% = 1000 bps).
    uint256 public constant DEV_ALLOC_BPS = 1000;
    uint256 public constant BPS_DENOM = 10_000;

    // ─── State ───────────────────────────────────────────────────────────────
    address public immutable owner;
    address public immutable protocolTreasury;
    address payable public feeRouter;
    address payable public predictionMarket;
    address public vestingController;
    address public graduationRouter;

    struct TokenInfo {
        address token;
        address curve;
        address creator;
        uint256 createdAt;
    }

    TokenInfo[] public tokens;
    mapping(address => address) public tokenToCurve;

    // ─── Events ──────────────────────────────────────────────────────────────
    event TokenCreated(address indexed token, address indexed curve, address indexed creator);
    event FeeRouterSet(address indexed feeRouter);
    event PredictionMarketSet(address indexed predictionMarket);
    event VestingControllerSet(address indexed vestingController);
    event GraduationRouterSet(address indexed graduationRouter);

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
     * @notice Sets the VestingController address. Can only be called once.
     * @param _vestingController The VestingController contract address
     */
    function setVestingController(address _vestingController) external onlyOwner {
        if (vestingController != address(0)) revert AlreadySet();
        if (_vestingController == address(0)) revert ZeroAddress();
        vestingController = _vestingController;
        emit VestingControllerSet(_vestingController);
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

        // Handle dev allocation: mint portion to VestingController (C4 fix)
        uint256 totalSupply = tok.totalSupply();
        uint256 devAlloc = (totalSupply * DEV_ALLOC_BPS) / BPS_DENOM;
        uint256 curveAlloc = totalSupply - devAlloc;
        if (devAlloc > 0 && vestingController != address(0)) {
            tok.transfer(vestingController, devAlloc);
            VestingController(vestingController).initVesting(
                tokenAddr,
                creatorAddress,
                devAlloc,
                VestingController.Tier.LIGHT,
                st
            );
        }
        // Transfer curve allocation to curve
        tok.transfer(curveAddr, curveAlloc);

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

        // Handle dev allocation (C4 fix)
        uint256 totalSupply = tok.totalSupply();
        uint256 devAlloc = (totalSupply * DEV_ALLOC_BPS) / BPS_DENOM;
        uint256 curveAlloc = totalSupply - devAlloc;
        if (devAlloc > 0 && vestingController != address(0)) {
            tok.transfer(vestingController, devAlloc);
            VestingController(vestingController).initVesting(
                tokenAddr,
                creatorAddress,
                devAlloc,
                VestingController.Tier.LIGHT,
                st
            );
        }
        tok.transfer(curveAddr, curveAlloc);

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
}