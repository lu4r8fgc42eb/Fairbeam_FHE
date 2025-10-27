// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {FHE, euint16, externalEuint16} from "@fhevm/solidity/lib/FHE.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ICreditScoring} from "../interfaces/ICreditScoring.sol";

/**
 * @title CreditScoring
 * @notice Manages encrypted credit risk profiles using FHE
 * @dev Stores encrypted risk scores (0-65535) for privacy-preserving credit assessment
 */
contract CreditScoring is ICreditScoring, SepoliaConfig, Ownable {
    struct EncryptedProfile {
        euint16 riskScore; // Encrypted risk score (0-65535)
        uint256 submittedAt;
        uint256 updatedAt;
        bool exists;
    }

    // User profiles
    mapping(address => EncryptedProfile) private profiles;

    // Authorized contracts that can access risk scores
    mapping(address => bool) public authorizedContracts;

    modifier onlyAuthorized() {
        require(authorizedContracts[msg.sender] || msg.sender == owner(), "Unauthorized");
        _;
    }

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Authorize contract to access credit scores
     * @param contractAddress Contract to authorize
     * @param authorized Authorization status
     */
    function setAuthorization(address contractAddress, bool authorized) external onlyOwner {
        authorizedContracts[contractAddress] = authorized;
    }

    /**
     * @inheritdoc ICreditScoring
     */
    function submitProfile(externalEuint16 riskHandle, bytes calldata proof) external override {
        euint16 risk = FHE.fromExternal(riskHandle, proof);
        FHE.allowThis(risk);
        FHE.allow(risk, msg.sender);

        profiles[msg.sender] = EncryptedProfile({
            riskScore: risk,
            submittedAt: block.timestamp,
            updatedAt: block.timestamp,
            exists: true
        });

        emit ProfileSubmitted(msg.sender);
    }

    /**
     * @inheritdoc ICreditScoring
     */
    function updateProfile(externalEuint16 riskHandle, bytes calldata proof) external override {
        if (!profiles[msg.sender].exists) revert NoProfile();

        euint16 risk = FHE.fromExternal(riskHandle, proof);
        FHE.allowThis(risk);
        FHE.allow(risk, msg.sender);

        profiles[msg.sender].riskScore = risk;
        profiles[msg.sender].updatedAt = block.timestamp;

        emit ProfileUpdated(msg.sender);
    }

    /**
     * @inheritdoc ICreditScoring
     */
    function getRiskScore(address user) external view override onlyAuthorized returns (euint16) {
        if (!profiles[user].exists) revert NoProfile();
        return profiles[user].riskScore;
    }

    /**
     * @inheritdoc ICreditScoring
     */
    function hasProfile(address user) external view override returns (bool) {
        return profiles[user].exists;
    }

    /**
     * @inheritdoc ICreditScoring
     */
    function reencryptRiskScore(address user, bytes calldata publicKey) external view override returns (bytes memory) {
        if (!profiles[user].exists) revert NoProfile();
        require(user == msg.sender, "Can only decrypt own score");
        // Note: FHE.reencrypt is not available in current version, return empty for now
        // Client should use FHE.allow() permissions instead
        return "";
    }

    /**
     * @notice Get profile metadata
     * @param user User address
     * @return submittedAt Profile submission timestamp
     * @return updatedAt Last update timestamp
     */
    function getProfileMetadata(address user) external view returns (uint256 submittedAt, uint256 updatedAt) {
        if (!profiles[user].exists) revert NoProfile();
        return (profiles[user].submittedAt, profiles[user].updatedAt);
    }
}
