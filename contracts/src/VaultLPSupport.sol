// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

/**
 * @title VaultLPSupport
 * @notice Stub vault that accepts MON for LP support purposes.
 *         No admin, no withdrawal logic — Phase 4 will add those.
 */
contract VaultLPSupport {
    event Deposited(address indexed sender, uint256 amount);

    receive() external payable {
        emit Deposited(msg.sender, msg.value);
    }
}