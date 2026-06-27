// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.27;

import "./LickPair.sol";

/**
 * @title LickFactory
 * @notice Minimal Uniswap V2-style factory for Lick.fun DEX pairs.
 * @dev Uses CREATE2 for deterministic pair addresses. Pairs are LickPair instances
 *      with a 0.25% LP-only swap fee. Only the GraduationRouter can create pairs.
 */
contract LickFactory {
    // ─── State ────────────────────────────────────────────────────────────────
    /// @dev NOTE (audit G-01): `allPairs` grows unbounded with every pair created.
    ///      It must NEVER be iterated on-chain — enumeration is for off-chain indexers only.
    mapping(address => mapping(address => address)) public getPair;
    address[] public allPairs;
    address public graduationRouter;
    address public immutable owner;

    /// @notice Once true, the graduation router can no longer be changed (audit M-01).
    bool public routerLocked;

    /// @notice Returns the number of pairs deployed.
    function allPairsLength() external view returns (uint256) {
        return allPairs.length;
    }

    // ─── Events ────────────────────────────────────────────────────────────────
    event PairCreated(address indexed token0, address indexed token1, address pair, uint256 allPairsLength);
    event GraduationRouterSet(address indexed router);
    event RouterLocked();

    // ─── Errors ────────────────────────────────────────────────────────────────
    error IdenticalAddresses();
    error ZeroAddress();
    error PairExists();
    error Unauthorized();
    error AlreadyLocked();
    error Create2Failed();

    // ─── Modifiers ──────────────────────────────────────────────────────────────
    modifier onlyRouter() {
        if (msg.sender != graduationRouter) revert Unauthorized();
        _;
    }

    constructor(address _graduationRouter) {
        graduationRouter = _graduationRouter;
        owner = msg.sender;
    }

    /**
     * @notice Sets the graduation router address. Disabled once {lockRouter} is called.
     * @dev The deploy script sets the deployer as a temporary router, then re-points to
     *      the real GraduationRouter and calls {lockRouter} to make it permanent (audit M-01).
     * @param _router The GraduationRouter address
     */
    function setGraduationRouter(address _router) external {
        if (msg.sender != owner) revert Unauthorized();
        if (routerLocked) revert AlreadyLocked();
        if (_router == address(0)) revert ZeroAddress();
        graduationRouter = _router;
        emit GraduationRouterSet(_router);
    }

    /**
     * @notice Permanently lock the graduation router so it can never be changed again.
     * @dev One-way switch. Call after the final {setGraduationRouter} during deploy handoff.
     */
    function lockRouter() external {
        if (msg.sender != owner) revert Unauthorized();
        if (routerLocked) revert AlreadyLocked();
        routerLocked = true;
        emit RouterLocked();
    }

    /**
     * @notice Creates a new LickPair for tokenA and tokenB.
     * @dev Tokens are sorted (token0 < token1). Reverts if pair already exists.
     *      Only the GraduationRouter can call this.
     * @param tokenA First token address
     * @param tokenB Second token address
     * @return pair The deployed LickPair address
     */
    function createPair(address tokenA, address tokenB) external onlyRouter returns (address pair) {
        if (tokenA == tokenB) revert IdenticalAddresses();
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        if (token0 == address(0)) revert ZeroAddress();
        if (getPair[token0][token1] != address(0)) revert PairExists();

        bytes memory bytecode = type(LickPair).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(token0, token1));
        assembly {
            pair := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
        if (pair == address(0)) revert Create2Failed(); // audit M-02

        LickPair(pair).initialize(token0, token1);

        getPair[token0][token1] = pair;
        getPair[token1][token0] = pair; // populate reverse mapping
        allPairs.push(pair);

        emit PairCreated(token0, token1, pair, allPairs.length);
    }
}