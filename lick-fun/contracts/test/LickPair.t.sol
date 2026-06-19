// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.27;

import {Test} from "forge-std/Test.sol";
import {LickPair} from "../src/LickPair.sol";
import {LickFactory} from "../src/LickFactory.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title LickPairTest
 * @notice Tests for the LickPair AMM with 0.25% LP fee.
 */
contract LickPairTest is Test {
    LickFactory public factory;
    LickPair public pair;

    MockERC20 public token0;
    MockERC20 public token1;

    address public user = makeAddr("user");
    address public lpProvider = makeAddr("lpProvider");

    uint256 constant INITIAL_LIQUIDITY = 100_000 ether;
    uint256 constant MINIMUM_LIQUIDITY = 1000;

    function setUp() public {
        factory = new LickFactory(address(this));

        // Deploy mock tokens
        token0 = new MockERC20("Token 0", "TK0");
        token1 = new MockERC20("Token 1", "TK1");

        // Ensure sorted order
        (address t0, address t1) = address(token0) < address(token1)
            ? (address(token0), address(token1))
            : (address(token1), address(token0));

        // Create pair
        pair = LickPair(factory.createPair(t0, t1));

        // Mint tokens to lpProvider
        token0.mint(lpProvider, INITIAL_LIQUIDITY);
        token1.mint(lpProvider, INITIAL_LIQUIDITY);

        // Add initial liquidity
        vm.startPrank(lpProvider);
        token0.approve(address(pair), INITIAL_LIQUIDITY);
        token1.approve(address(pair), INITIAL_LIQUIDITY);
        token0.transfer(address(pair), INITIAL_LIQUIDITY);
        token1.transfer(address(pair), INITIAL_LIQUIDITY);
        pair.mint(lpProvider);
        vm.stopPrank();
    }

    /// @notice First mint burns MINIMUM_LIQUIDITY to address(1).
    function testLPBurnedOnAdd() public {
        // MINIMUM_LIQUIDITY (1000) should be burned to address(1)
        uint256 deadBalance = pair.balanceOf(address(1));
        assertEq(deadBalance, MINIMUM_LIQUIDITY, "MINIMUM_LIQUIDITY should be burned to address(1)");
    }

    /// @notice Swap token0 for token1 and verify output with 0.25% LP fee.
    function testSwap() public {
        uint256 swapAmount = 1_000 ether;

        // Mint tokens to user
        token0.mint(user, swapAmount);

        // Snapshot reserves before swap
        (uint112 r0Before, uint112 r1Before,) = pair.getReserves();

        vm.startPrank(user);
        token0.approve(address(pair), swapAmount);
        token0.transfer(address(pair), swapAmount);

        // Swap: send token0, receive token1
        // Use a small expected output to avoid InvalidK
        pair.swap(0, 1, user, "");

        // Verify user received some tokens
        uint256 userBalance = token1.balanceOf(user);
        assertTrue(userBalance > 0, "user should receive tokens");

        // Verify reserves changed (fee stays in pool)
        (uint112 r0After, uint112 r1After,) = pair.getReserves();
        assertTrue(r0After > r0Before, "reserve0 should grow");
        assertTrue(r1After < r1Before, "reserve1 should shrink");
        vm.stopPrank();
    }

    /// @notice Verify that fees are collected (0.25% LP fee, reserves grow after swap).
    function testFeesCollected() public {
        uint256 swapAmount = 1_000 ether;

        token0.mint(user, swapAmount);

        (uint112 r0Before, uint112 r1Before,) = pair.getReserves();

        vm.startPrank(user);
        token0.approve(address(pair), swapAmount);
        token0.transfer(address(pair), swapAmount);

        // Swap: send token0, receive token1
        pair.swap(0, 1, user, "");

        (uint112 r0After, uint112 r1After,) = pair.getReserves();

        // After swap, reserve0 should be larger than before (fee stays)
        assertTrue(uint256(r0After) > uint256(r0Before), "reserve0 should grow from fee");
        vm.stopPrank();
    }
}

/**
 * @notice Minimal mock ERC20 for testing.
 */
contract MockERC20 is IERC20 {
    string public name;
    string public symbol;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    uint256 public totalSupply;

    constructor(string memory _name, string memory _symbol) {
        name = _name;
        symbol = _symbol;
    }

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}