// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {FHE, ebool, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ICollateralManager} from "./interfaces/ICollateralManager.sol";
import {ILiquidityPool} from "./interfaces/ILiquidityPool.sol";

/**
 * @title FHELendingWithDecrypt
 * @notice Privacy-preserving lending with encrypted amounts
 * @dev Flow: Submit encrypted amount → Record encrypted debt → Decrypt → Claim funds
 */
contract FHELendingWithDecrypt is SepoliaConfig, Ownable, ReentrancyGuard {
    struct BorrowRequest {
        euint64 amountEnc;           // Encrypted borrow amount
        uint256 timestamp;
        bool claimed;
    }

    // Constants
    uint256 public constant COLLATERAL_RATIO = 200;  // 200% collateralization (50% LTV)

    // Module contracts
    ICollateralManager public collateralManager;
    ILiquidityPool public liquidityPool;

    // Storage
    mapping(address => BorrowRequest) public borrowRequests;
    mapping(address => euint64) public totalDebtEnc;        // Encrypted total debt
    mapping(address => uint256) public totalDebtPlain;      // Plaintext debt (for checks)
    uint256 public requestCounter;

    // Events
    event CollateralDeposited(address indexed user, uint256 amount);
    event CollateralWithdrawn(address indexed user, uint256 amount);
    event BorrowRequested(address indexed borrower, uint256 requestId, uint256 timestamp);
    event FundsClaimed(address indexed borrower, uint256 amount);
    event Repaid(address indexed borrower, uint256 amount);

    // Errors
    error InsufficientCollateral();
    error ExceedsCollateralLimit();
    error NoActiveRequest();
    error AlreadyClaimed();
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
        uint256 debt = totalDebtPlain[msg.sender];

        // Calculate minimum collateral needed
        uint256 minCollateral = (debt * COLLATERAL_RATIO) / 100;

        if (collateral < minCollateral + amount) {
            revert InsufficientCollateral();
        }

        collateralManager.withdrawFor(msg.sender, amount);
        emit CollateralWithdrawn(msg.sender, amount);
    }

    /**
     * @notice Step 1: Submit encrypted borrow request
     * @param amountHandle External encrypted uint64 handle
     * @param proof ZK proof for encryption
     */
    function requestBorrow(
        externalEuint64 amountHandle,
        bytes calldata proof
    ) external nonReentrant returns (uint256 requestId) {
        uint256 collateral = collateralManager.getCollateral(msg.sender);
        if (collateral == 0) revert InsufficientCollateral();

        // Import encrypted amount (no limit check here - will check on claim with plaintext)
        euint64 amountEnc = FHE.fromExternal(amountHandle, proof);
        FHE.allowThis(amountEnc);

        // Store the borrow request
        borrowRequests[msg.sender] = BorrowRequest({
            amountEnc: amountEnc,
            timestamp: block.timestamp,
            claimed: false
        });

        // Allow user to decrypt their borrow amount
        FHE.allow(amountEnc, msg.sender);

        requestId = ++requestCounter;

        emit BorrowRequested(msg.sender, requestId, block.timestamp);
        return requestId;
    }

    /**
     * @notice Step 2: Claim funds with decrypted amount
     * @param amountPlain Plaintext amount (must match encrypted amount from request)
     * @dev In production, this should verify a ZK proof that amountPlain matches encrypted value
     */
    function claimBorrowedFunds(uint256 amountPlain) external nonReentrant {
        BorrowRequest storage request = borrowRequests[msg.sender];

        if (request.timestamp == 0) revert NoActiveRequest();
        if (request.claimed) revert AlreadyClaimed();
        if (amountPlain == 0) revert ZeroAmount();

        // Verify collateral limits (double check with plaintext)
        uint256 collateral = collateralManager.getCollateral(msg.sender);
        uint256 currentDebt = totalDebtPlain[msg.sender];
        uint256 maxBorrow = (collateral * 100) / COLLATERAL_RATIO;

        if (currentDebt + amountPlain > maxBorrow) {
            revert ExceedsCollateralLimit();
        }

        // Check liquidity
        if (!liquidityPool.hasSufficientLiquidity(amountPlain)) {
            revert InsufficientLiquidity();
        }

        // Mark as claimed
        request.claimed = true;

        // Update encrypted debt
        euint64 amountEnc = request.amountEnc;
        euint64 currentDebtEnc = totalDebtEnc[msg.sender];

        if (FHE.isInitialized(currentDebtEnc)) {
            totalDebtEnc[msg.sender] = FHE.add(currentDebtEnc, amountEnc);
        } else {
            totalDebtEnc[msg.sender] = amountEnc;
        }

        // Allow user to access their encrypted debt
        FHE.allowThis(totalDebtEnc[msg.sender]);
        FHE.allow(totalDebtEnc[msg.sender], msg.sender);

        // Update plaintext debt for withdrawal checks
        totalDebtPlain[msg.sender] += amountPlain;

        // Disburse funds
        liquidityPool.disburseLoan(msg.sender, amountPlain);

        emit FundsClaimed(msg.sender, amountPlain);
    }

    /**
     * @notice Repay borrowed amount
     */
    function repay() external payable nonReentrant {
        if (msg.value == 0) revert ZeroAmount();

        uint256 debt = totalDebtPlain[msg.sender];
        if (debt == 0) revert NoDebtToRepay();

        uint256 repayAmount = msg.value > debt ? debt : msg.value;
        uint256 excess = msg.value - repayAmount;

        // Update plaintext debt
        totalDebtPlain[msg.sender] = debt - repayAmount;

        // If fully repaid, clear borrow request
        if (totalDebtPlain[msg.sender] == 0) {
            delete borrowRequests[msg.sender];
        }

        // Return funds to liquidity pool
        (bool success, ) = address(liquidityPool).call{value: repayAmount}("");
        require(success, "Pool transfer failed");
        liquidityPool.recordRepayment(msg.sender, repayAmount);

        // Return excess to borrower if any
        if (excess > 0) {
            (bool excessSuccess, ) = msg.sender.call{value: excess}("");
            require(excessSuccess, "Excess refund failed");
        }

        emit Repaid(msg.sender, repayAmount);
    }

    /**
     * @notice Get borrow request handle for decryption
     * @param user User address
     * @return Encrypted borrow amount handle
     */
    function getBorrowAmountHandle(address user) external view returns (euint64) {
        return borrowRequests[user].amountEnc;
    }

    /**
     * @notice Get encrypted total debt handle for decryption
     * @param user User address
     * @return Encrypted debt handle
     */
    function getTotalDebtHandle(address user) external view returns (euint64) {
        return totalDebtEnc[user];
    }

    /**
     * @notice Check if user has active unclaimed request
     */
    function hasActiveRequest(address user) external view returns (bool) {
        BorrowRequest storage request = borrowRequests[user];
        return request.timestamp > 0 && !request.claimed;
    }

    /**
     * @notice Get user collateral
     */
    function getCollateral(address user) external view returns (uint256) {
        return collateralManager.getCollateral(user);
    }

    /**
     * @notice Get outstanding debt (plaintext for UI)
     */
    function getOutstandingDebt(address user) external view returns (uint256) {
        return totalDebtPlain[user];
    }

    /**
     * @notice Calculate max borrowable amount
     */
    function getMaxBorrowable(address user) external view returns (uint256) {
        uint256 collateral = collateralManager.getCollateral(user);
        uint256 currentDebt = totalDebtPlain[user];
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
