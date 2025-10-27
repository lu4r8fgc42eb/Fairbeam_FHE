// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {externalEuint16, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {ICollateralManager} from "./interfaces/ICollateralManager.sol";
import {ICreditScoring} from "./interfaces/ICreditScoring.sol";
import {ILoanManager} from "./interfaces/ILoanManager.sol";
import {ILiquidityPool} from "./interfaces/ILiquidityPool.sol";

/**
 * @title FHELendingV2
 * @notice Main orchestration contract for FHE-based private lending platform
 * @dev Coordinates between modular components: CollateralManager, CreditScoring, LoanManager, and LiquidityPool
 *
 * Architecture:
 * - CollateralManager: Handles user collateral deposits and withdrawals
 * - CreditScoring: Manages encrypted credit risk profiles
 * - LoanManager: Processes encrypted loan requests and approvals
 * - LiquidityPool: Manages lending pool liquidity
 */
contract FHELendingV2 is SepoliaConfig, Ownable, ReentrancyGuard {
    // Module contracts
    ICollateralManager public collateralManager;
    ICreditScoring public creditScoring;
    ILoanManager public loanManager;
    ILiquidityPool public liquidityPool;

    // Events
    event ModuleUpdated(string indexed moduleName, address indexed oldAddress, address indexed newAddress);
    event LoanDisbursed(address indexed borrower, uint256 requestId, uint256 amount);
    event RepaymentProcessed(address indexed borrower, uint256 amount);

    // Errors
    error ModuleNotSet();
    error InvalidModule();

    constructor(
        address _collateralManager,
        address _creditScoring,
        address _loanManager,
        address _liquidityPool
    ) Ownable(msg.sender) {
        require(_collateralManager != address(0), "Invalid collateral manager");
        require(_creditScoring != address(0), "Invalid credit scoring");
        require(_loanManager != address(0), "Invalid loan manager");
        require(_liquidityPool != address(0), "Invalid liquidity pool");

        collateralManager = ICollateralManager(_collateralManager);
        creditScoring = ICreditScoring(_creditScoring);
        loanManager = ILoanManager(_loanManager);
        liquidityPool = ILiquidityPool(_liquidityPool);
    }

    // ============ Collateral Management ============

    /**
     * @notice Deposit ETH as collateral
     */
    function depositCollateral() external payable nonReentrant {
        collateralManager.depositFor{value: msg.value}(msg.sender);
    }

    /**
     * @notice Withdraw collateral if health factor allows
     * @param amount Amount to withdraw
     */
    function withdrawCollateral(uint256 amount) external nonReentrant {
        uint256 outstanding = loanManager.getOutstandingDebt(msg.sender);
        require(
            collateralManager.canWithdraw(msg.sender, amount, outstanding),
            "Withdrawal would violate health factor"
        );
        collateralManager.withdrawCollateral(amount);
    }

    // ============ Credit Profile Management ============

    /**
     * @notice Submit encrypted credit risk profile
     * @param riskHandle External encrypted uint16 handle
     * @param proof ZK proof for encryption
     */
    function submitProfile(externalEuint16 riskHandle, bytes calldata proof) external {
        creditScoring.submitProfile(riskHandle, proof);
    }

    /**
     * @notice Update existing credit risk profile
     * @param riskHandle External encrypted uint16 handle
     * @param proof ZK proof for encryption
     */
    function updateProfile(externalEuint16 riskHandle, bytes calldata proof) external {
        creditScoring.updateProfile(riskHandle, proof);
    }

    // ============ Loan Management ============

    /**
     * @notice Request encrypted loan
     * @param amountHandle External encrypted uint64 handle
     * @param proof ZK proof for encryption
     * @return requestId Unique request identifier
     */
    function requestLoan(
        externalEuint64 amountHandle,
        bytes calldata proof
    ) external nonReentrant returns (uint256 requestId) {
        return loanManager.requestLoanFor(msg.sender, amountHandle, proof);
    }

    /**
     * @notice Claim approved loan
     * @param requestId Loan request ID
     * @param amountPlain Plaintext amount to claim
     * @param decryptedApproval Decrypted approval status
     */
    function claimLoan(
        uint256 requestId,
        uint256 amountPlain,
        uint8 decryptedApproval
    ) external nonReentrant {
        // Verify and update loan state in LoanManager
        loanManager.claimLoan(requestId, amountPlain, decryptedApproval);

        // Check liquidity and disburse
        require(liquidityPool.hasSufficientLiquidity(amountPlain), "Insufficient pool liquidity");
        liquidityPool.disburseLoan(msg.sender, amountPlain);

        emit LoanDisbursed(msg.sender, requestId, amountPlain);
    }

    /**
     * @notice Repay loan
     */
    function repay() external payable nonReentrant {
        require(msg.value > 0, "Zero repayment");

        uint256 outstanding = loanManager.getOutstandingDebt(msg.sender);
        require(outstanding > 0, "No outstanding debt");

        // Record repayment in LoanManager
        loanManager.recordRepayment(msg.sender, msg.value);

        // Transfer funds to liquidity pool
        (bool success, ) = address(liquidityPool).call{value: msg.value}("");
        require(success, "Transfer to pool failed");
        liquidityPool.recordRepayment(msg.sender, msg.value);

        emit RepaymentProcessed(msg.sender, msg.value);
    }

    // ============ Liquidity Pool Management ============

    /**
     * @notice Add liquidity to lending pool
     */
    function addLiquidity() external payable nonReentrant {
        liquidityPool.addLiquidity{value: msg.value}();
    }

    /**
     * @notice Remove liquidity from pool
     * @param amount Amount to remove
     */
    function removeLiquidity(uint256 amount) external nonReentrant {
        liquidityPool.removeLiquidity(amount);
    }

    // ============ View Functions ============

    /**
     * @notice Get user's collateral balance
     * @param user User address
     * @return Collateral amount
     */
    function getCollateral(address user) external view returns (uint256) {
        return collateralManager.getCollateral(user);
    }

    /**
     * @notice Get user's outstanding debt
     * @param user User address
     * @return Outstanding debt amount
     */
    function getOutstandingDebt(address user) external view returns (uint256) {
        return loanManager.getOutstandingDebt(user);
    }

    /**
     * @notice Get pool liquidity
     * @return Available liquidity
     */
    function getPoolLiquidity() external view returns (uint256) {
        return liquidityPool.getTotalLiquidity();
    }

    /**
     * @notice Get user's latest loan request ID
     * @param user User address
     * @return Latest request ID
     */
    function getLatestRequestId(address user) external view returns (uint256) {
        return loanManager.getLatestRequestId(user);
    }

    /**
     * @notice Check if user has credit profile
     * @param user User address
     * @return True if profile exists
     */
    function hasProfile(address user) external view returns (bool) {
        return creditScoring.hasProfile(user);
    }

    /**
     * @notice Reencrypt latest loan approval for decryption
     * @param publicKey Client's public key
     * @return Reencrypted data
     */
    function reencryptLatestApproval(bytes calldata publicKey) external view returns (bytes memory) {
        uint256 requestId = loanManager.getLatestRequestId(msg.sender);
        return loanManager.reencryptApproval(requestId, publicKey);
    }

    /**
     * @notice Reencrypt latest loan amount for decryption
     * @param publicKey Client's public key
     * @return Reencrypted data
     */
    function reencryptLatestAmount(bytes calldata publicKey) external view returns (bytes memory) {
        uint256 requestId = loanManager.getLatestRequestId(msg.sender);
        return loanManager.reencryptAmount(requestId, publicKey);
    }

    // ============ Admin Functions ============

    /**
     * @notice Update module contracts (for upgrades)
     * @param moduleName Name of module to update
     * @param newAddress New module address
     */
    function updateModule(string memory moduleName, address newAddress) external onlyOwner {
        require(newAddress != address(0), "Invalid address");

        if (keccak256(bytes(moduleName)) == keccak256(bytes("CollateralManager"))) {
            address old = address(collateralManager);
            collateralManager = ICollateralManager(newAddress);
            emit ModuleUpdated(moduleName, old, newAddress);
        } else if (keccak256(bytes(moduleName)) == keccak256(bytes("CreditScoring"))) {
            address old = address(creditScoring);
            creditScoring = ICreditScoring(newAddress);
            emit ModuleUpdated(moduleName, old, newAddress);
        } else if (keccak256(bytes(moduleName)) == keccak256(bytes("LoanManager"))) {
            address old = address(loanManager);
            loanManager = ILoanManager(newAddress);
            emit ModuleUpdated(moduleName, old, newAddress);
        } else if (keccak256(bytes(moduleName)) == keccak256(bytes("LiquidityPool"))) {
            address old = address(liquidityPool);
            liquidityPool = ILiquidityPool(newAddress);
            emit ModuleUpdated(moduleName, old, newAddress);
        } else {
            revert InvalidModule();
        }
    }

    /**
     * @notice Get all module addresses
     * @return Module addresses in order: CollateralManager, CreditScoring, LoanManager, LiquidityPool
     */
    function getModules() external view returns (address, address, address, address) {
        return (
            address(collateralManager),
            address(creditScoring),
            address(loanManager),
            address(liquidityPool)
        );
    }
}
