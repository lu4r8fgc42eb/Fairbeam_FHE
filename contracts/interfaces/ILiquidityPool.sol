// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title ILiquidityPool
 * @notice Interface for managing lending pool liquidity
 */
interface ILiquidityPool {
    // Events
    event LiquidityAdded(address indexed provider, uint256 amount);
    event LiquidityRemoved(address indexed provider, uint256 amount);
    event LoanDisbursed(address indexed borrower, uint256 amount);
    event RepaymentReceived(address indexed borrower, uint256 amount);

    // Errors
    error InsufficientLiquidity();
    error InsufficientBalance();
    error TransferFailed();

    /**
     * @notice Add liquidity to the pool
     */
    function addLiquidity() external payable;

    /**
     * @notice Remove liquidity from the pool
     * @param amount Amount to remove
     */
    function removeLiquidity(uint256 amount) external;

    /**
     * @notice Disburse loan to borrower (called by LoanManager)
     * @param borrower Borrower address
     * @param amount Loan amount
     */
    function disburseLoan(address borrower, uint256 amount) external;

    /**
     * @notice Record repayment (called by main contract)
     * @param borrower Borrower address
     * @param amount Repayment amount
     */
    function recordRepayment(address borrower, uint256 amount) external;

    /**
     * @notice Get total pool liquidity
     * @return Available liquidity
     */
    function getTotalLiquidity() external view returns (uint256);

    /**
     * @notice Get user's liquidity contribution
     * @param provider Provider address
     * @return User's contribution amount
     */
    function getUserLiquidity(address provider) external view returns (uint256);

    /**
     * @notice Check if pool has sufficient liquidity for loan
     * @param amount Required amount
     * @return True if sufficient
     */
    function hasSufficientLiquidity(uint256 amount) external view returns (bool);
}
