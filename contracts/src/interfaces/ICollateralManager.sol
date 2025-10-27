// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title ICollateralManager
 * @notice Interface for managing user collateral deposits and withdrawals
 */
interface ICollateralManager {
    // Events
    event CollateralDeposited(address indexed user, uint256 amount);
    event CollateralWithdrawn(address indexed user, uint256 amount);

    // Errors
    error InsufficientCollateral();
    error WithdrawBlocked();
    error ZeroAmount();

    /**
     * @notice Deposit ETH as collateral
     */
    function depositCollateral() external payable;

    /**
     * @notice Deposit ETH as collateral on behalf of a user (authorized contracts only)
     * @param depositor The user address to credit the collateral to
     */
    function depositFor(address depositor) external payable;

    /**
     * @notice Withdraw collateral if health factor allows
     * @param amount Amount to withdraw in wei
     */
    function withdrawCollateral(uint256 amount) external;

    /**
     * @notice Withdraw collateral on behalf of a user (authorized contracts only)
     * @param user User address
     * @param amount Amount to withdraw in wei
     */
    function withdrawFor(address user, uint256 amount) external;

    /**
     * @notice Get user's collateral balance
     * @param user User address
     * @return Collateral amount in wei
     */
    function getCollateral(address user) external view returns (uint256);

    /**
     * @notice Check if withdrawal amount is allowed based on outstanding debt
     * @param user User address
     * @param amount Amount to withdraw
     * @param outstanding Current debt amount
     * @return True if withdrawal is safe
     */
    function canWithdraw(address user, uint256 amount, uint256 outstanding) external view returns (bool);
}
