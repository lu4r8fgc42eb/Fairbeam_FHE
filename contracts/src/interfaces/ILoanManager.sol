// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {euint8, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";

/**
 * @title ILoanManager
 * @notice Interface for managing encrypted loan requests and approvals
 */
interface ILoanManager {
    // Loan status enum
    enum LoanStatus {
        Pending,
        Approved,
        Rejected,
        Claimed,
        Repaid
    }

    // Events
    event LoanRequested(address indexed user, uint256 requestId, uint256 timestamp);
    event LoanApproved(address indexed user, uint256 requestId);
    event LoanRejected(address indexed user, uint256 requestId);
    event LoanClaimed(address indexed user, uint256 requestId, uint256 amount);

    // Errors
    error NoRequest();
    error AlreadyClaimed();
    error InvalidProof();
    error NotApproved();
    error LoanNotFound();

    /**
     * @notice Submit encrypted loan request
     * @param amountHandle External encrypted uint64 handle
     * @param proof ZK proof for encryption
     * @return requestId Unique request identifier
     */
    function requestLoan(externalEuint64 amountHandle, bytes calldata proof) external returns (uint256 requestId);

    /**
     * @notice Request loan on behalf of a user (authorized contracts only)
     * @param borrower The user address requesting the loan
     * @param amountHandle External encrypted uint64 handle
     * @param proof ZK proof for encryption
     * @return requestId Unique request identifier
     */
    function requestLoanFor(
        address borrower,
        externalEuint64 amountHandle,
        bytes calldata proof
    ) external returns (uint256 requestId);

    /**
     * @notice Claim approved loan by revealing plaintext amount
     * @param requestId Loan request ID
     * @param amountPlain Plaintext amount to claim
     * @param decryptedApproval Decrypted approval status (0 or 1)
     */
    function claimLoan(uint256 requestId, uint256 amountPlain, uint8 decryptedApproval) external;

    /**
     * @notice Record repayment (called by main contract)
     * @param borrower Borrower address
     * @param amount Repayment amount
     */
    function recordRepayment(address borrower, uint256 amount) external;

    /**
     * @notice Get encrypted approval status for request
     * @param user User address
     * @param requestId Request ID
     * @return Encrypted approval (euint8)
     */
    function getApprovalStatus(address user, uint256 requestId) external view returns (euint8);

    /**
     * @notice Get encrypted loan amount for request
     * @param user User address
     * @param requestId Request ID
     * @return Encrypted amount (euint64)
     */
    function getLoanAmount(address user, uint256 requestId) external view returns (euint64);

    /**
     * @notice Reencrypt approval status for client-side decryption
     * @param requestId Request ID
     * @param publicKey Client's public key
     * @return Reencrypted data
     */
    function reencryptApproval(uint256 requestId, bytes calldata publicKey) external view returns (bytes memory);

    /**
     * @notice Reencrypt loan amount for client-side decryption
     * @param requestId Request ID
     * @param publicKey Client's public key
     * @return Reencrypted data
     */
    function reencryptAmount(uint256 requestId, bytes calldata publicKey) external view returns (bytes memory);

    /**
     * @notice Get latest request ID for user
     * @param user User address
     * @return Latest request ID
     */
    function getLatestRequestId(address user) external view returns (uint256);

    /**
     * @notice Get outstanding debt for user
     * @param user User address
     * @return Outstanding debt amount
     */
    function getOutstandingDebt(address user) external view returns (uint256);

    /**
     * @notice Get encrypted outstanding debt for user
     * @param user User address
     * @return Encrypted outstanding debt amount (euint64)
     */
    function getEncryptedOutstandingDebt(address user) external view returns (euint64);
}
