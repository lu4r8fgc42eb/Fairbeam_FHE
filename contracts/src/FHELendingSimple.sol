// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ICollateralManager} from "./interfaces/ICollateralManager.sol";
import {ILiquidityPool} from "./interfaces/ILiquidityPool.sol";

/**
 * @title FHELendingSimple
 * @notice Simplified lending protocol - direct borrowing against collateral
 * @dev Removed complex FHE approval logic for straightforward collateral-based lending
 */
contract FHELendingSimple is SepoliaConfig, Ownable, ReentrancyGuard {
    // Constants
    uint256 public constant COLLATERAL_RATIO = 200;  // 200% collateralization (50% LTV)

    // Module contracts
    ICollateralManager public collateralManager;
    ILiquidityPool public liquidityPool;

    // Storage
    mapping(address => uint256) public borrowedAmount;

    // Events
    event CollateralDeposited(address indexed user, uint256 amount);
    event CollateralWithdrawn(address indexed user, uint256 amount);
    event Borrowed(address indexed borrower, uint256 amount);
    event Repaid(address indexed borrower, uint256 amount);

    // Errors
    error InsufficientCollateral();
    error ExceedsCollateralLimit();
    error NoDebtToRepay();
    error InsufficientLiquidity();
    error ZeroAmount();

    constructor(
        address _collateralManager,
        address _liquidityPool
    ) Ownable(msg.sender) {
        collateralManager = ICollateralManager(_collateralManager);
        liquidityPool = ILiquidityPool(_liquidityPool);
    }

    /**
     * @notice Deposit ETH as collateral
     */
    function depositCollateral() external payable nonReentrant {
        if (msg.value == 0) revert ZeroAmount();
        collateralManager.depositFor{value: msg.value}(msg.sender);
        emit CollateralDeposited(msg.sender, msg.value);
    }

    /**
     * @notice Withdraw collateral (only if not backing loans)
     */
    function withdrawCollateral(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();

        uint256 collateral = collateralManager.getCollateral(msg.sender);
        uint256 debt = borrowedAmount[msg.sender];

        // Calculate minimum collateral needed
        uint256 minCollateral = (debt * COLLATERAL_RATIO) / 100;

        if (collateral - amount < minCollateral) {
            revert InsufficientCollateral();
        }

        collateralManager.withdrawFor(msg.sender, amount);
        emit CollateralWithdrawn(msg.sender, amount);
    }

    /**
     * @notice Borrow ETH against collateral
     * @param amount Amount to borrow in wei
     */
    function borrow(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();

        uint256 collateral = collateralManager.getCollateral(msg.sender);
        uint256 currentDebt = borrowedAmount[msg.sender];
        uint256 newDebt = currentDebt + amount;

        // Check collateral ratio
        uint256 maxBorrow = (collateral * 100) / COLLATERAL_RATIO;
        if (newDebt > maxBorrow) {
            revert ExceedsCollateralLimit();
        }

        // Check liquidity pool has funds
        if (!liquidityPool.hasSufficientLiquidity(amount)) {
            revert InsufficientLiquidity();
        }

        // Update debt
        borrowedAmount[msg.sender] = newDebt;

        // Transfer funds from pool to borrower
        liquidityPool.disburseLoan(msg.sender, amount);

        emit Borrowed(msg.sender, amount);
    }

    /**
     * @notice Repay borrowed amount
     */
    function repay() external payable nonReentrant {
        if (msg.value == 0) revert ZeroAmount();

        uint256 debt = borrowedAmount[msg.sender];
        if (debt == 0) revert NoDebtToRepay();

        uint256 repayAmount = msg.value > debt ? debt : msg.value;
        uint256 excess = msg.value - repayAmount;

        // Update debt
        borrowedAmount[msg.sender] = debt - repayAmount;

        // Return funds to liquidity pool
        (bool success, ) = address(liquidityPool).call{value: repayAmount}("");
        require(success, "Pool transfer failed");

        // Notify pool about repayment
        liquidityPool.recordRepayment(msg.sender, repayAmount);

        // Return excess to borrower if any
        if (excess > 0) {
            (bool excessSuccess, ) = msg.sender.call{value: excess}("");
            require(excessSuccess, "Excess refund failed");
        }

        emit Repaid(msg.sender, repayAmount);
    }

    /**
     * @notice Get user collateral
     */
    function getCollateral(address user) external view returns (uint256) {
        return collateralManager.getCollateral(user);
    }

    /**
     * @notice Get outstanding debt
     */
    function getOutstandingDebt(address user) external view returns (uint256) {
        return borrowedAmount[user];
    }

    /**
     * @notice Calculate max borrowable amount
     */
    function getMaxBorrowable(address user) external view returns (uint256) {
        uint256 collateral = collateralManager.getCollateral(user);
        uint256 currentDebt = borrowedAmount[user];
        uint256 availableLiquidity = liquidityPool.getTotalLiquidity();

        // Max based on collateral
        uint256 maxByCollateral = (collateral * 100) / COLLATERAL_RATIO;

        // Available to borrow
        uint256 available = maxByCollateral > currentDebt ? maxByCollateral - currentDebt : 0;

        // Limited by pool liquidity
        return available > availableLiquidity ? availableLiquidity : available;
    }

    /**
     * @notice Get available pool liquidity
     */
    function getAvailableLiquidity() external view returns (uint256) {
        return liquidityPool.getTotalLiquidity();
    }
}
