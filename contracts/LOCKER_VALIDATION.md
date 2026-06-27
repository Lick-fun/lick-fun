# LP Locker Validation Guide

## Step-by-step: Validating UNCX / Team Finance LP Lockers with Lickfun.xyz

### Prerequisites

- A Lickfun.xyz token that has graduated (curve reached 100k MON threshold)
- The DEX pair address from the graduation event
- LP tokens (ERC-20 V2-style) in your wallet
- Access to UNCX LP Locker UI (https://app.uncx.network/lock-lp) or Team Finance (https://app.team.finance/lock-lp)

### Step 1: Deploy a Test Token through Factory

```solidity
// Using cast or via the Lickfun.xyz frontend
// Call Factory.createToken("TestLick", "TLICK", 0)
// Note the token address and curve address from the TokenCreated event
```

### Step 2: Graduate the Token

```solidity
// Buy enough tokens to push monReserve >= 100,000 MON
// After graduation, the BondingCurve emits: Graduated(address indexed token, uint256 monRaised)
// The DEX pair is deployed by the graduation handler (post-graduation infrastructure)
// Note the pair address from the graduation event or the DEX factory
```

### Step 3: Note the DEX Pair Address

The pair address is derived from the standard Uniswap V2 create2 formula:

```
pair = address(uint160(uint256(keccak256(abi.encodePacked(
    hex'ff',
    factory,
    keccak256(abi.encodePacked(token0, token1)),
    init_code_hash
)))))
```

Where:
- `factory` = the DEX factory address
- `token0` / `token1` = sorted token addresses (LickToken + Wrapped MON)
- `init_code_hash` = standard Uniswap V2 init code hash

### Step 4: Attempt to Lock LP Tokens via UNCX Locker UI

1. Navigate to https://app.uncx.network/lock-lp
2. Connect your wallet (the wallet holding LP tokens)
3. Enter the pair address from Step 3
4. The UI should auto-detect the pair if:
   - The init code hash matches the standard Uniswap V2 hash
   - The LP token contract is recognized
   - The pair is compatible with the V2 LP interface

5. Specify lock duration and amount
6. Approve the locker contract to spend LP tokens
7. Confirm the lock transaction

### Step 5: Verify Locker Recognizes the Pair

**Check if the locker recognizes the pair out of the box:**

| Check | Expected Result | Action if Fails |
|-------|----------------|-----------------|
| Pair detected in UI | Yes, auto-populates | Manually enter pair address |
| LP token balance shown | Yes | Verify LP tokens are in the wallet |
| Lock function available | Yes | Check locker contract is deployed on the chain |
| Transaction succeeds | Yes | See Adapter Needed section below |

### Step 6: Verify LP Tokens Are Transferable and Lockable

Run these checks:

```solidity
// 1. Verify LP token is standard ERC-20
IERC20 lpToken = IERC20(pairAddress);
string memory name = lpToken.name();    // Should return e.g. "LICK-MON LP"
string memory symbol = lpToken.symbol(); // Should return e.g. "LICK-MON-LP"
uint256 decimals = lpToken.decimals();  // Should be 18

// 2. Verify LP tokens are transferable
lpToken.transfer(someAddress, 1 ether);  // Should succeed

// 3. Verify LP tokens implement permit (optional but nice)
// Check if supportsPermit via ERC-2612 or EIP-712

// 4. Verify totalSupply matches expected
uint256 totalSupply = lpToken.totalSupply();
```

### Step 7: Does It Work Out of the Box?

**Standard Uniswap V2 pairs:** YES — these work out of the box with UNCX and Team Finance.

**Key compatibility factors:**

1. **Init code hash**: UNCX and Team Finance use the standard Uniswap V2 init code hash to detect pairs. If the DEX uses a different hash (e.g., PancakeSwap's), the locker may not auto-detect the pair.

2. **LP token interface**: Must implement the standard `IUniswapV2Pair` interface:
   - `token0()`, `token1()`, `getReserves()`, `totalSupply()`, `balanceOf()`, `transfer()`, `approve()`, `transferFrom()`
   - Optional: `permit()`, `DOMAIN_SEPARATOR()`, `nonces()`

3. **Chain support**: The locker contract must be deployed on the same chain (Monad testnet). Verify UNCX/Team Finance has deployed on the target chain.

### Adapter Needed Scenarios

| Scenario | Solution |
|----------|----------|
| Different init code hash | Contact UNCX/Team Finance to add the new hash to their registry. Provide the correct init code hash. |
| Locker not deployed on chain | Deploy the locker contract to the target chain, or use a self-hosted locker instance. |
| LP token has non-standard interface | Build an adapter contract that wraps the LP token in a standard Uniswap V2 interface. |
| Locker requires whitelisting | Submit the pair address for whitelisting through the locker's governance process. |

### Minimal Adapter Contract (if needed)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title LickLPLockerAdapter
 * @notice Adapter that presents a standard Uniswap V2 interface to LP lockers
 *         if the underlying pair uses a non-standard interface.
 */
contract LickLPLockerAdapter {
    // Maps to the actual pair address
    address public immutable pair;
    address public immutable token0;
    address public immutable token1;

    constructor(address _pair) {
        pair = _pair;
        // Read token0/token1 from the actual pair
        token0 = IUniswapV2Pair(_pair).token0();
        token1 = IUniswapV2Pair(_pair).token1();
    }

    // Forward all standard LP operations to the actual pair
    function totalSupply() external view returns (uint256) {
        return IERC20(pair).totalSupply();
    }

    function balanceOf(address account) external view returns (uint256) {
        return IERC20(pair).balanceOf(account);
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        return IERC20(pair).transfer(to, amount);
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        return IERC20(pair).approve(spender, amount);
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        return IERC20(pair).transferFrom(from, to, amount);
    }
}
```

### Testnet Validation Checklist

- [ ] Token deployed and graduated
- [ ] DEX pair address confirmed
- [ ] LP tokens received in wallet
- [ ] LP token is transferable (transfer 1 wei test)
- [ ] UNCX UI detects pair
- [ ] Lock transaction submitted
- [ ] Lock transaction confirmed
- [ ] Locked LP tokens visible in locker dashboard
- [ ] LP tokens cannot be transferred while locked
- [ ] Lock expires correctly at the specified timestamp

### Notes

- Lickfun.xyz uses **Uniswap V2-style fungible ERC-20 LP tokens** (standard transferable), so compatibility with existing lockers should be straightforward.
- If the graduation DEX factory uses a different `init_code_hash` than standard Uniswap V2, contact the locker provider to register the hash.
- For Monad testnet, verify UNCX/Team Finance has a deployment on the chain. If not, deploy a minimal locker contract using Battle-tested patterns from OpenZeppelin or equivalent.