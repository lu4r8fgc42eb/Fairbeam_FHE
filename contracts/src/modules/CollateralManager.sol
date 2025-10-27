// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ICollateralManager} from "../interfaces/ICollateralManager.sol";

/**
 * @title CollateralManager
 * @notice Manages user collateral deposits and withdrawals with health factor checks
 * @dev Maintains 200% collateralization ratio (2 * debt <= collateral)
 */
contract CollateralManager is ICollateralManager, Ownable, ReentrancyGuard {
    // User collateral balances (plaintext ETH)
    mapping(address => uint256) private collateralBalances;

    // Authorized contracts that can query collateral
    mapping(address => bool) public authorizedContracts;

    modifier onlyAuthorized() {
        require(authorizedContracts[msg.sender] || msg.sender == owner(), "Unauthorized");
        _;
    }

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Authorize contract to access collateral data
     * @param contractAddress Contract to authorize
     * @param authorized Authorization status
     */
    function setAuthorization(address contractAddress, bool authorized) external onlyOwner {
        authorizedContracts[contractAddress] = authorized;
    }

    /**
     * @inheritdoc ICollateralManager
     */
    function depositCollateral() external payable override nonReentrant {
        if (msg.value == 0) revert ZeroAmount();

        collateralBalances[msg.sender] += msg.value;
        emit CollateralDeposited(msg.sender, msg.value);
    }

    /**
     * @notice Deposit collateral on behalf of a user (authorized contracts only)
     * @param depositor The user address to credit the collateral to
     */
    function depositFor(address depositor) external payable onlyAuthorized nonReentrant {
        if (msg.value == 0) revert ZeroAmount();
        require(depositor != address(0), "Invalid depositor");

        collateralBalances[depositor] += msg.value;
        emit CollateralDeposited(depositor, msg.value);
    }

    /**
     * @inheritdoc ICollateralManager
     */
    function withdrawCollateral(uint256 amount) external override nonReentrant {
        if (amount == 0) revert ZeroAmount();

        uint256 balance = collateralBalances[msg.sender];
        if (amount > balance) revert InsufficientCollateral();

        collateralBalances[msg.sender] = balance - amount;

        (bool success, ) = msg.sender.call{value: amount}("");
        if (!success) revert WithdrawBlocked();

        emit CollateralWithdrawn(msg.sender, amount);
    }

    /**
     * @inheritdoc ICollateralManager
     */
    function getCollateral(address user) external view override returns (uint256) {
        return collateralBalances[user];
    }

    /**
     * @inheritdoc ICollateralManager
     * @dev Checks if withdrawal maintains 200% collateralization: 2 * debt <= remaining collateral
     */
    function canWithdraw(
        address user,
        uint256 amount,
        uint256 outstanding
    ) external view override onlyAuthorized returns (bool) {
        uint256 balance = collateralBalances[user];
        if (amount > balance) return false;

        uint256 remaining = balance - amount;
        // Maintain 200% collateralization ratio
        return 2 * outstanding <= remaining;
    }

    /**
     * @notice Update collateral for liquidation (called by authorized contracts)
     * @param user User address
     * @param amount Amount to deduct
     */
    function deductCollateral(address user, uint256 amount) external onlyAuthorized {
        uint256 balance = collateralBalances[user];
        require(amount <= balance, "Insufficient collateral");
        collateralBalances[user] = balance - amount;
    }
}
