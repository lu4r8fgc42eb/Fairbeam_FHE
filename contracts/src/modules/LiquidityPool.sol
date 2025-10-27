// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ILiquidityPool} from "../interfaces/ILiquidityPool.sol";

/**
 * @title LiquidityPool
 * @notice Manages lending pool liquidity and loan disbursements
 * @dev Tracks liquidity providers and handles fund distribution
 */
contract LiquidityPool is ILiquidityPool, Ownable, ReentrancyGuard {
    // User liquidity contributions
    mapping(address => uint256) private liquidityProvided;

    // Total liquidity tracking
    uint256 private totalProvided;

    // Authorized contracts that can disburse loans
    mapping(address => bool) public authorizedContracts;

    modifier onlyAuthorized() {
        require(authorizedContracts[msg.sender] || msg.sender == owner(), "Unauthorized");
        _;
    }

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Authorize contract to disburse loans
     * @param contractAddress Contract to authorize
     * @param authorized Authorization status
     */
    function setAuthorization(address contractAddress, bool authorized) external onlyOwner {
        authorizedContracts[contractAddress] = authorized;
    }

    /**
     * @inheritdoc ILiquidityPool
     */
    function addLiquidity() external payable override nonReentrant {
        require(msg.value > 0, "Zero amount");

        liquidityProvided[msg.sender] += msg.value;
        totalProvided += msg.value;

        emit LiquidityAdded(msg.sender, msg.value);
    }

    /**
     * @inheritdoc ILiquidityPool
     */
    function removeLiquidity(uint256 amount) external override nonReentrant {
        require(amount > 0, "Zero amount");

        uint256 userLiquidity = liquidityProvided[msg.sender];
        if (amount > userLiquidity) revert InsufficientBalance();

        // Check if pool has sufficient funds
        if (amount > address(this).balance) revert InsufficientLiquidity();

        liquidityProvided[msg.sender] = userLiquidity - amount;
        totalProvided -= amount;

        (bool success, ) = msg.sender.call{value: amount}("");
        if (!success) revert TransferFailed();

        emit LiquidityRemoved(msg.sender, amount);
    }

    /**
     * @inheritdoc ILiquidityPool
     */
    function disburseLoan(address borrower, uint256 amount) external override onlyAuthorized nonReentrant {
        require(borrower != address(0), "Invalid borrower");
        require(amount > 0, "Zero amount");

        if (amount > address(this).balance) revert InsufficientLiquidity();

        (bool success, ) = borrower.call{value: amount}("");
        if (!success) revert TransferFailed();

        emit LoanDisbursed(borrower, amount);
    }

    /**
     * @inheritdoc ILiquidityPool
     */
    function recordRepayment(address borrower, uint256 amount) external override onlyAuthorized {
        emit RepaymentReceived(borrower, amount);
    }

    /**
     * @inheritdoc ILiquidityPool
     */
    function getTotalLiquidity() external view override returns (uint256) {
        return address(this).balance;
    }

    /**
     * @inheritdoc ILiquidityPool
     */
    function getUserLiquidity(address provider) external view override returns (uint256) {
        return liquidityProvided[provider];
    }

    /**
     * @inheritdoc ILiquidityPool
     */
    function hasSufficientLiquidity(uint256 amount) external view override returns (bool) {
        return address(this).balance >= amount;
    }

    /**
     * @notice Get total liquidity provided (historical tracking)
     * @return Total amount provided by all users
     */
    function getTotalProvided() external view returns (uint256) {
        return totalProvided;
    }

    /**
     * @notice Get pool utilization rate
     * @return Utilization percentage (0-10000 for 0-100%)
     */
    function getUtilizationRate() external view returns (uint256) {
        if (totalProvided == 0) return 0;
        uint256 utilized = totalProvided - address(this).balance;
        return (utilized * 10000) / totalProvided;
    }

    /**
     * @notice Receive ETH for repayments or direct deposits
     */
    receive() external payable {
        // Accept ETH repayments and direct deposits
    }

    /**
     * @notice Fallback for ETH transfers
     */
    fallback() external payable {
        // Accept ETH
    }
}
