// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.27;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title LickPair
 * @notice Minimal Uniswap V2-style AMM pair with a 0.25% LP-only swap fee.
 * @dev 0.25% LP fee only. Creator and protocol fees are not collected on DEX
 *      trades — they are bonding-curve-only. Standard V2 constant-product invariant.
 *      ERC-20 LP token is transferable.
 */
contract LickPair is ERC20, ReentrancyGuard {
    // ─── Constants ────────────────────────────────────────────────────────────
    uint256 public constant MINIMUM_LIQUIDITY = 1000;
    uint256 public constant FEE_NUMERATOR = 25;   // 0.25% = 25/10000
    uint256 public constant FEE_DENOMINATOR = 10000;

    // ─── State ────────────────────────────────────────────────────────────────
    address public factory;
    address public token0;
    address public token1;

    uint112 private reserve0_;
    uint112 private reserve1_;
    uint32 private blockTimestampLast;

    // ─── Events ────────────────────────────────────────────────────────────────
    event Mint(address indexed sender, uint256 amount0, uint256 amount1);
    event Burn(address indexed sender, uint256 amount0, uint256 amount1, address indexed to);
    event Swap(
        address indexed sender,
        uint256 amount0In,
        uint256 amount1In,
        uint256 amount0Out,
        uint256 amount1Out,
        address indexed to
    );
    event Sync(uint112 reserve0, uint112 reserve1);

    // ─── Errors ────────────────────────────────────────────────────────────────
    error Forbidden();
    error InsufficientLiquidity();
    error InsufficientInputAmount();
    error InsufficientOutputAmount();
    error InvalidK();
    error Overflow();

    // ─── Modifiers ──────────────────────────────────────────────────────────────
    modifier onlyFactory() {
        if (msg.sender != factory) revert Forbidden();
        _;
    }

    constructor() ERC20("Lick LP Token", "LICK-LP") {
        factory = msg.sender;
    }

    /**
     * @notice Called once by the factory to set token0 and token1.
     * @dev Sorted addresses: token0 < token1.
     */
    function initialize(address _token0, address _token1) external {
        if (msg.sender != factory) revert Forbidden();
        token0 = _token0;
        token1 = _token1;
    }

    // ─── State Getters ────────────────────────────────────────────────────────

    function getReserves() public view returns (uint112 _reserve0, uint112 _reserve1, uint32 _blockTimestampLast) {
        _reserve0 = reserve0_;
        _reserve1 = reserve1_;
        _blockTimestampLast = blockTimestampLast;
    }

    // ─── Core AMM ──────────────────────────────────────────────────────────────

    /**
     * @notice Mint LP tokens proportional to the deposited token amounts.
     * @dev Caller must have transferred token0 and token1 to this contract.
     *      On first mint, MINIMUM_LIQUIDITY LP tokens are burned to address(1).
     * @param to Address to receive LP tokens
     * @return liquidity Amount of LP tokens minted
     */
    function mint(address to) external nonReentrant returns (uint256 liquidity) {
        (uint112 _reserve0, uint112 _reserve1,) = getReserves();
        uint256 balance0 = IERC20(token0).balanceOf(address(this));
        uint256 balance1 = IERC20(token1).balanceOf(address(this));
        uint256 amount0 = balance0 - _reserve0;
        uint256 amount1 = balance1 - _reserve1;

        if (amount0 == 0 || amount1 == 0) revert InsufficientInputAmount();

        uint256 _totalSupply = totalSupply();
        if (_totalSupply == 0) {
            liquidity = _sqrt(amount0 * amount1) - MINIMUM_LIQUIDITY;
            _mint(address(1), MINIMUM_LIQUIDITY); // permanently lock first MINIMUM_LIQUIDITY
        } else {
            liquidity = _min(
                (amount0 * _totalSupply) / _reserve0,
                (amount1 * _totalSupply) / _reserve1
            );
        }

        if (liquidity == 0) revert InsufficientLiquidity();

        _mint(to, liquidity);

        _update(balance0, balance1, _reserve0, _reserve1);

        emit Mint(msg.sender, amount0, amount1);
    }

    /**
     * @notice Burn LP tokens and return proportional token0 and token1.
     * @param to Address to receive the underlying tokens
     * @return amount0 Amount of token0 returned
     * @return amount1 Amount of token1 returned
     */
    function burn(address to) external nonReentrant returns (uint256 amount0, uint256 amount1) {
        (uint112 _reserve0, uint112 _reserve1,) = getReserves();
        address _token0 = token0;
        address _token1 = token1;
        uint256 balance0 = IERC20(_token0).balanceOf(address(this));
        uint256 balance1 = IERC20(_token1).balanceOf(address(this));
        uint256 liquidity = balanceOf(address(this));

        uint256 _totalSupply = totalSupply();
        amount0 = (liquidity * balance0) / _totalSupply;
        amount1 = (liquidity * balance1) / _totalSupply;

        if (amount0 == 0 || amount1 == 0) revert InsufficientLiquidity();

        _burn(address(this), liquidity);
        IERC20(_token0).transfer(to, amount0);
        IERC20(_token1).transfer(to, amount1);

        balance0 = IERC20(_token0).balanceOf(address(this));
        balance1 = IERC20(_token1).balanceOf(address(this));

        _update(balance0, balance1, _reserve0, _reserve1);

        emit Burn(msg.sender, amount0, amount1, to);
    }

    /**
     * @notice Swap tokens. 0.25% LP fee stays in the pool.
     * @dev Standard V2 invariant with fee = 25/10000.
     *      balanceAdjusted = balance * 10000 - amountIn * 25
     *      Invariant: balanceAdjusted0 * balanceAdjusted1 >= reserve0 * reserve1 * 100_000_000
     *      Creator and protocol fees are not collected on DEX trades — they are bonding-curve-only.
     */
    function swap(uint256 amount0Out, uint256 amount1Out, address to, bytes calldata data) external nonReentrant {
        if (amount0Out == 0 && amount1Out == 0) revert InsufficientOutputAmount();
        (uint112 _reserve0, uint112 _reserve1,) = getReserves();
        if (amount0Out > _reserve0 || amount1Out > _reserve1) revert InsufficientLiquidity();

        // Transfer outputs
        if (amount0Out > 0) IERC20(token0).transfer(to, amount0Out);
        if (amount1Out > 0) IERC20(token1).transfer(to, amount1Out);

        // Callback for flash swaps / data
        if (data.length > 0) {
            IUniswapV2Callee(to).uniswapV2Call(msg.sender, amount0Out, amount1Out, data);
        }

        uint256 balance0 = IERC20(token0).balanceOf(address(this));
        uint256 balance1 = IERC20(token1).balanceOf(address(this));

        // Determine input amounts
        uint256 amount0In = balance0 > _reserve0 - amount0Out ? balance0 - (_reserve0 - amount0Out) : 0;
        uint256 amount1In = balance1 > _reserve1 - amount1Out ? balance1 - (_reserve1 - amount1Out) : 0;

        if (amount0In == 0 && amount1In == 0) revert InsufficientInputAmount();

        // Fee-adjusted balance: balance * 10000 - amountIn * 25 (0.25% LP fee)
        uint256 balance0Adjusted = (balance0 * FEE_DENOMINATOR) - (amount0In * FEE_NUMERATOR);
        uint256 balance1Adjusted = (balance1 * FEE_DENOMINATOR) - (amount1In * FEE_NUMERATOR);

        // Invariant: k must not decrease
        if (balance0Adjusted * balance1Adjusted < uint256(_reserve0) * uint256(_reserve1) * (FEE_DENOMINATOR ** 2)) {
            revert InvalidK();
        }

        _update(balance0, balance1, _reserve0, _reserve1);

        emit Swap(msg.sender, amount0In, amount1In, amount0Out, amount1Out, to);
    }

    /**
     * @notice Force reserves to match current balances.
     */
    function sync() external nonReentrant {
        uint256 balance0 = IERC20(token0).balanceOf(address(this));
        uint256 balance1 = IERC20(token1).balanceOf(address(this));
        _update(balance0, balance1, reserve0_, reserve1_);
    }

    // ─── Internal ──────────────────────────────────────────────────────────────

    function _update(uint256 balance0, uint256 balance1, uint112 _reserve0, uint112 _reserve1) private {
        if (balance0 > type(uint112).max || balance1 > type(uint112).max) revert Overflow();
        uint32 blockTimestamp = uint32(block.timestamp % 2 ** 32);
        uint32 timeElapsed = blockTimestamp - blockTimestampLast;
        if (timeElapsed > 0 && _reserve0 != 0 && _reserve1 != 0) {
            // price accumulator update (standard V2 oracle)
            // omitted for simplicity — can be added later
        }
        reserve0_ = uint112(balance0);
        reserve1_ = uint112(balance1);
        blockTimestampLast = blockTimestamp;
        emit Sync(reserve0_, reserve1_);
    }

    function _min(uint256 a, uint256 b) private pure returns (uint256) {
        return a < b ? a : b;
    }

    function _sqrt(uint256 y) private pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }
}

/**
 * @notice Callback interface for flash swaps.
 */
interface IUniswapV2Callee {
    function uniswapV2Call(address sender, uint256 amount0, uint256 amount1, bytes calldata data) external;
}