// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.27;

import {Test} from "forge-std/Test.sol";
import {LickFactory} from "../src/LickFactory.sol";
import {LickPair} from "../src/LickPair.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title LickFactoryTest
 * @notice Tests for the LickFactory V2-style factory.
 */
contract LickFactoryTest is Test {
    LickFactory public factory;

    address public tokenA = makeAddr("tokenA");
    address public tokenB = makeAddr("tokenB");

    function setUp() public {
        factory = new LickFactory(address(this));
    }

    /// @notice Creates a pair and verifies it's stored in getPair and allPairs.
    function testCreatePair() public {
        // Deploy mock ERC20 tokens
        MockERC20 tokA = new MockERC20("Token A", "TKA");
        MockERC20 tokB = new MockERC20("Token B", "TKB");
        address a = address(tokA);
        address b = address(tokB);

        // Ensure sorted order
        (address token0, address token1) = a < b ? (a, b) : (b, a);

        address pair = factory.createPair(a, b);

        assertTrue(pair != address(0), "pair should not be zero");
        assertEq(factory.getPair(token0, token1), pair, "getPair[token0][token1]");
        assertEq(factory.getPair(token1, token0), pair, "getPair[token1][token0]");
        assertEq(factory.allPairs(0), pair, "allPairs[0]");
        assertEq(factory.allPairsLength(), 1, "allPairs length");
    }

    /// @notice Verifies getPair returns address(0) for non-existent pairs.
    function testGetPair() public {
        assertEq(factory.getPair(tokenA, tokenB), address(0), "non-existent pair should be zero");
        assertEq(factory.getPair(tokenB, tokenA), address(0), "reverse non-existent pair should be zero");
    }

    /// @notice Creating a duplicate pair should revert.
    function testCannotCreateDuplicate() public {
        MockERC20 tokA = new MockERC20("Token A", "TKA");
        MockERC20 tokB = new MockERC20("Token B", "TKB");

        factory.createPair(address(tokA), address(tokB));

        vm.expectRevert(LickFactory.PairExists.selector);
        factory.createPair(address(tokA), address(tokB));
    }

    /// @notice Creating a pair with identical addresses should revert.
    function testCannotCreateIdenticalTokens() public {
        vm.expectRevert(LickFactory.IdenticalAddresses.selector);
        factory.createPair(tokenA, tokenA);
    }

    /// @notice Creating a pair with zero address should revert.
    function testCannotCreateZeroAddress() public {
        vm.expectRevert(LickFactory.ZeroAddress.selector);
        factory.createPair(address(0), tokenA);
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