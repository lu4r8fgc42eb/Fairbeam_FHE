// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {euint16, externalEuint16} from "@fhevm/solidity/lib/FHE.sol";

/**
 * @title ICreditScoring
 * @notice Interface for managing encrypted credit risk profiles
 */
interface ICreditScoring {
    // Events
    event ProfileSubmitted(address indexed user);
    event ProfileUpdated(address indexed user);

    // Errors
    error NoProfile();
    error InvalidRiskScore();

    /**
     * @notice Submit encrypted risk score profile
     * @param riskHandle External encrypted uint16 handle
     * @param proof ZK proof for encryption
     */
    function submitProfile(externalEuint16 riskHandle, bytes calldata proof) external;

    /**
     * @notice Update existing risk score profile
     * @param riskHandle External encrypted uint16 handle
     * @param proof ZK proof for encryption
     */
    function updateProfile(externalEuint16 riskHandle, bytes calldata proof) external;

    /**
     * @notice Get encrypted risk score for user
     * @param user User address
     * @return Encrypted risk score (euint16)
     */
    function getRiskScore(address user) external view returns (euint16);

    /**
     * @notice Check if user has submitted profile
     * @param user User address
     * @return True if profile exists
     */
    function hasProfile(address user) external view returns (bool);

    /**
     * @notice Reencrypt risk score for client-side decryption
     * @param user User address
     * @param publicKey Client's public key
     * @return Reencrypted data
     */
    function reencryptRiskScore(address user, bytes calldata publicKey) external view returns (bytes memory);
}
