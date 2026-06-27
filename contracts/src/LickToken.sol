// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.27;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title LickToken
/// @notice Standard ERC-20 with 18 decimals. Minted in full to the deployer (Factory)
///         at construction. No extra logic — pure OpenZeppelin ERC-20.
/// @dev   Total supply is fixed at 1,000,000,000e18 and minted to msg.sender.
contract LickToken is ERC20 {
    /// @notice Fixed total supply: 1,000,000,000 tokens with 18 decimals.
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 ether;

    /// @param name   ERC-20 token name
    /// @param symbol ERC-20 token symbol
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        // Mint the entire supply to the deployer (Factory), which then transfers
        // the balance to the BondingCurve that governs this token.
        _mint(msg.sender, TOTAL_SUPPLY);
    }

    /// @notice Burn tokens from the caller's balance.
    /// @dev    Called by VaultBuybackBurn after buying back tokens from the DEX.
    /// @param amount Number of tokens (in wei) to burn.
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}