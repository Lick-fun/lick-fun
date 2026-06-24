// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

/**
 * @title VaultBuybackBurn
 * @notice Stub vault that accepts MON for buyback-and-burn purposes.
 *         No admin, no withdrawal logic — Phase 4 will add those.
 */
contract VaultBuybackBurn {
    event Deposited(address indexed sender, uint256 amount);

    receive() external payable {
        emit Deposited(msg.sender, msg.value);
    }
}