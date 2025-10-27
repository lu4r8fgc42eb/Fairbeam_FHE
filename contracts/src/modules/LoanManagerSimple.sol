// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ICollateralManager} from "../interfaces/ICollateralManager.sol";

/**
 * @title LoanManagerSimple
 * @notice Simplified loan manager - borrow directly against collateral
 * @dev No approval needed, just check collateral ratio
 */
contract LoanManagerSimple is SepoliaConfig, Ownable, ReentrancyGuard {
    // Constants
    uint256 public constant COLLATERAL_RATIO = 200;  // 200% collateralization (50% LTV)

    // Dependencies
    ICollateralManager public collateralManager;

    // Storage
    mapping(address => uint256) public borrowedAmount;

    // Authorized contracts
    mapping(address => bool) public authorizedContracts;

    // Events
    event Borrowed(address indexed borrower, uint256 amount);
    event Repaid(address indexed borrower, uint256 amount);

    // Errors
    error InsufficientCollateral();
    error ExceedsCollateralLimit();
    error NoDebtToRepay();
    error Unauthorized();

    modifier onlyAuthorized() {
        if (!authorizedContracts[msg.sender] && msg.sender != owner()) {
            revert Unauthorized();
        }
        _;
    }

    constructor(address _collateralManager) Ownable(msg.sender) {
        collateralManager = ICollateralManager(_collateralManager);
    }

    /**
     * @notice Set authorization for a contract
     */
    function setAuthorization(address _contract, bool _authorized) external onlyOwner {
        authorizedContracts[_contract] = _authorized;
    }

    /**
     * @notice Borrow against collateral
     * @param borrower User address
     * @param amount Amount to borrow
     */
    function borrow(address borrower, uint256 amount) external onlyAuthorized nonReentrant {
        if (amount == 0) revert InsufficientCollateral();

        uint256 collateral = collateralManager.getCollateral(borrower);
        uint256 currentDebt = borrowedAmount[borrower];
        uint256 newDebt = currentDebt + amount;

        // Check collateral ratio: debt * COLLATERAL_RATIO <= collateral * 100
        // This means: collateral must be 2x the debt (200% collateralization)
        uint256 maxBorrow = (collateral * 100) / COLLATERAL_RATIO;

        if (newDebt > maxBorrow) {
            revert ExceedsCollateralLimit();
        }

        borrowedAmount[borrower] = newDebt;

        emit Borrowed(borrower, amount);
    }

    /**
     * @notice Repay borrowed amount
     * @param borrower User address
     * @param amount Amount to repay
     */
    function repay(address borrower, uint256 amount) external onlyAuthorized nonReentrant {
        uint256 debt = borrowedAmount[borrower];
        if (debt == 0) revert NoDebtToRepay();

        uint256 repayAmount = amount > debt ? debt : amount;
        borrowedAmount[borrower] = debt - repayAmount;

        emit Repaid(borrower, repayAmount);
    }

    /**
     * @notice Get outstanding debt for a user
     */
    function getOutstandingDebt(address user) external view returns (uint256) {
        return borrowedAmount[user];
    }

    /**
     * @notice Calculate max borrowable amount for user
     */
    function getMaxBorrowable(address user) external view returns (uint256) {
        uint256 collateral = collateralManager.getCollateral(user);
        uint256 currentDebt = borrowedAmount[user];
        uint256 maxBorrow = (collateral * 100) / COLLATERAL_RATIO;

        if (maxBorrow > currentDebt) {
            return maxBorrow - currentDebt;
        }
        return 0;
    }
}
