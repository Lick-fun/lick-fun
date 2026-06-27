// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.27;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @notice Minimal WETH9 / WMON interface for wrapping and unwrapping native MON.
 */
interface IWMON {
    function deposit() external payable;
    function withdraw(uint256 wad) external;
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 value) external returns (bool);
    function approve(address spender, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

/**
 * @notice Minimal LickFactory interface — only `getPair` is needed.
 */
interface ILickFactory {
    function getPair(address tokenA, address tokenB) external view returns (address pair);
}

/**
 * @notice Minimal LickPair interface — only `swap`, `getReserves`, `token0`, `token1`.
 */
interface ILickPair {
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
    function token0() external view returns (address);
    function token1() external view returns (address);
    function swap(uint256 amount0Out, uint256 amount1Out, address to, bytes calldata data) external;
}

/**
 * @title LickRouter
 * @notice Minimal Uniswap V2-style router for Lick.fun's post-graduation DEX (LickPair).
 *
 * @dev Only supports single-hop swaps between a LickToken and WMON.
 *      Users interact with native MON on the ETH side — this contract wraps/unwraps
 *      WMON internally.
 *
 *      Fee: LickPair charges a 0.25% LP fee (25 bps).
 *      Formula (matching LickPair invariant check):
 *        amountInWithFee = amountIn × 9975
 *        amountOut = (amountInWithFee × reserveOut) / (reserveIn × 10000 + amountInWithFee)
 *
 *      Security: ReentrancyGuard, SafeERC20, deadline + amountOutMin slippage guard.
 *      MUST be included in the Lick.fun security audit before mainnet deploy.
 */
contract LickRouter is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─── Constants ────────────────────────────────────────────────────────────

    /// @notice LickPair LP fee numerator (25 = 0.25%).
    uint256 public constant FEE_NUMERATOR = 25;

    /// @notice LickPair LP fee denominator (10000).
    uint256 public constant FEE_DENOMINATOR = 10_000;

    // ─── Immutables ───────────────────────────────────────────────────────────

    /// @notice Lick.fun DEX factory (LickFactory) for pair lookups.
    address public immutable factory;

    /// @notice Wrapped MON (WMON) address.
    address public immutable wmon;

    // ─── Errors ────────────────────────────────────────────────────────────────

    error DeadlineExpired();
    error PairNotFound();
    error InsufficientOutputAmount();
    error InsufficientInputAmount();
    error ZeroAddress();

    // ─── Constructor ──────────────────────────────────────────────────────────

    /// @param _factory  LickFactory address (DEX pair registry).
    /// @param _wmon     Wrapped MON (WMON) ERC-20 address.
    constructor(address _factory, address _wmon) {
        if (_factory == address(0) || _wmon == address(0)) revert ZeroAddress();
        factory = _factory;
        wmon = _wmon;
    }

    // ─── Modifiers ────────────────────────────────────────────────────────────

    modifier ensureDeadline(uint256 deadline) {
        if (block.timestamp > deadline) revert DeadlineExpired();
        _;
    }

    // ─── Public helpers ───────────────────────────────────────────────────────

    /**
     * @notice Compute the exact output for a given input using LickPair's 0.25% fee.
     * @param amountIn   Input token amount (in wei).
     * @param reserveIn  Reserve of the input token in the pair.
     * @param reserveOut Reserve of the output token in the pair.
     * @return amountOut Expected output amount (in wei).
     */
    function getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) public pure returns (uint256 amountOut) {
        if (amountIn == 0) revert InsufficientInputAmount();
        if (reserveIn == 0 || reserveOut == 0) revert InsufficientInputAmount();
        // Matches LickPair invariant: fee = 25 bps
        uint256 amountInWithFee = amountIn * (FEE_DENOMINATOR - FEE_NUMERATOR);
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = (reserveIn * FEE_DENOMINATOR) + amountInWithFee;
        amountOut = numerator / denominator;
    }

    /**
     * @notice Look up the LickPair for a given token + WMON.
     * @param token The LickToken address.
     * @return pair  The LickPair address (reverts if not found).
     */
    function getPair(address token) public view returns (address pair) {
        pair = ILickFactory(factory).getPair(token, wmon);
        if (pair == address(0)) revert PairNotFound();
    }

    // ─── Swap: MON → Token ────────────────────────────────────────────────────

    /**
     * @notice Swap exact native MON for a LickToken.
     * @dev Wraps MON → WMON internally, transfers WMON to pair, calls pair.swap.
     * @param token        The LickToken address to receive.
     * @param amountOutMin Minimum tokens to receive (slippage guard).
     * @param to           Recipient of the output tokens.
     * @param deadline     Unix timestamp after which the tx reverts.
     * @return amountOut   Actual tokens received.
     */
    function swapExactETHForTokens(
        address token,
        uint256 amountOutMin,
        address to,
        uint256 deadline
    )
        external
        payable
        nonReentrant
        ensureDeadline(deadline)
        returns (uint256 amountOut)
    {
        if (to == address(0)) revert ZeroAddress();
        uint256 amountIn = msg.value;
        if (amountIn == 0) revert InsufficientInputAmount();

        address pair = getPair(token);

        // Wrap MON → WMON
        IWMON(wmon).deposit{value: amountIn}();

        // Determine reserves (sorted order)
        (uint112 reserve0, uint112 reserve1,) = ILickPair(pair).getReserves();
        address token0 = ILickPair(pair).token0();

        (uint256 reserveWmon, uint256 reserveToken) = (wmon == token0)
            ? (uint256(reserve0), uint256(reserve1))
            : (uint256(reserve1), uint256(reserve0));

        amountOut = getAmountOut(amountIn, reserveWmon, reserveToken);
        if (amountOut < amountOutMin) revert InsufficientOutputAmount();

        // Transfer WMON to pair
        // Use IERC20 transfer (WMON is an ERC-20)
        IERC20(wmon).safeTransfer(pair, amountIn);

        // Call pair.swap: WMON → token
        (uint256 amount0Out, uint256 amount1Out) = (wmon == token0)
            ? (uint256(0), amountOut)
            : (amountOut, uint256(0));

        ILickPair(pair).swap(amount0Out, amount1Out, to, new bytes(0));
    }

    // ─── Swap: Token → MON ────────────────────────────────────────────────────

    /**
     * @notice Swap exact LickToken for native MON.
     * @dev Pulls tokens from caller, transfers to pair, swaps for WMON, unwraps to MON.
     *      Caller must approve this contract for at least `amountIn` tokens beforehand.
     * @param token        The LickToken address to sell.
     * @param amountIn     Exact amount of tokens to sell (in wei).
     * @param amountOutMin Minimum MON to receive (slippage guard).
     * @param to           Recipient of native MON.
     * @param deadline     Unix timestamp after which the tx reverts.
     * @return amountOut   Actual MON received (in wei).
     */
    function swapExactTokensForETH(
        address token,
        uint256 amountIn,
        uint256 amountOutMin,
        address to,
        uint256 deadline
    )
        external
        nonReentrant
        ensureDeadline(deadline)
        returns (uint256 amountOut)
    {
        if (to == address(0)) revert ZeroAddress();
        if (amountIn == 0) revert InsufficientInputAmount();

        address pair = getPair(token);

        // Determine reserves (sorted order)
        (uint112 reserve0, uint112 reserve1,) = ILickPair(pair).getReserves();
        address token0 = ILickPair(pair).token0();

        (uint256 reserveToken, uint256 reserveWmon) = (token == token0)
            ? (uint256(reserve0), uint256(reserve1))
            : (uint256(reserve1), uint256(reserve0));

        amountOut = getAmountOut(amountIn, reserveToken, reserveWmon);
        if (amountOut < amountOutMin) revert InsufficientOutputAmount();

        // Pull tokens from caller into pair directly (saves one transfer)
        IERC20(token).safeTransferFrom(msg.sender, pair, amountIn);

        // Call pair.swap: token → WMON (WMON comes to this contract for unwrapping)
        (uint256 amount0Out, uint256 amount1Out) = (token == token0)
            ? (uint256(0), amountOut)
            : (amountOut, uint256(0));

        ILickPair(pair).swap(amount0Out, amount1Out, address(this), new bytes(0));

        // Unwrap WMON → native MON and forward to recipient
        IWMON(wmon).withdraw(amountOut);
        (bool ok,) = payable(to).call{value: amountOut}("");
        require(ok, "MON_TRANSFER_FAILED");
    }

    // ─── Receive ──────────────────────────────────────────────────────────────

    /// @notice Accept native MON ONLY from WMON.withdraw() (audit L-08).
    /// @dev Restricting the sender prevents stray, unrecoverable MON from being sent
    ///      directly to the router.
    receive() external payable {
        require(msg.sender == wmon, "ONLY_WMON");
    }
}
