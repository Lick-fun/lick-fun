// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

/**
 * @title VaultBuybackBurn
 * @notice Vault that accepts MON for buyback-and-burn purposes.
 * @dev Funds are recoverable by an owner (intended to be a multisig/timelock treasury)
 *      via {sweep}. This prevents routed protocol fees from being permanently locked
 *      (audit C-01). Phase 4 may replace the owner with on-chain buyback-and-burn logic.
 */
contract VaultBuybackBurn {
    /// @notice Owner authorised to sweep funds (multisig/timelock treasury).
    address public immutable owner;

    event Deposited(address indexed sender, uint256 amount);
    event Swept(address indexed to, uint256 amount);

    error NotOwner();
    error ZeroAddress();
    error SweepFailed();

    constructor(address _owner) {
        if (_owner == address(0)) revert ZeroAddress();
        owner = _owner;
    }

    receive() external payable {
        emit Deposited(msg.sender, msg.value);
    }

    /**
     * @notice Withdraw MON from the vault to a destination address.
     * @param to Recipient of the swept MON.
     * @param amount Amount of MON (wei) to sweep.
     */
    function sweep(address to, uint256 amount) external {
        if (msg.sender != owner) revert NotOwner();
        if (to == address(0)) revert ZeroAddress();
        (bool ok, ) = payable(to).call{value: amount}("");
        if (!ok) revert SweepFailed();
        emit Swept(to, amount);
    }
}