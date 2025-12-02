// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ConfidentialETH (cETH)
 * @notice Wraps ETH into confidential encrypted tokens for privacy-preserving transfers
 * @dev Users deposit ETH to receive encrypted cETH balance, all transfers are encrypted
 *
 * Privacy Model:
 * - Wrap: ETH amount visible (unavoidable), but cETH balance is encrypted
 * - Transfer: Amount transferred is encrypted, observers see only ciphertext
 * - Unwrap: User chooses when to reveal amount by unwrapping
 */
contract ConfidentialETH is ZamaEthereumConfig, Ownable, ReentrancyGuard {
    // Encrypted balances
    mapping(address => euint64) private _encBalances;

    // Total supply (plaintext for pool accounting)
    uint256 private _totalSupply;

    // Authorized contracts that can transfer on behalf of users
    mapping(address => mapping(address => bool)) private _operatorApprovals;

    // Token metadata
    string public constant name = "Confidential ETH";
    string public constant symbol = "cETH";
    uint8 public constant decimals = 18;

    // Events
    event Wrap(address indexed user, uint256 amount);
    event Unwrap(address indexed user, uint256 amount);
    event EncryptedTransfer(address indexed from, address indexed to);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    // Errors
    error ZeroAmount();
    error InsufficientBalance();
    error UnwrapFailed();
    error NotAuthorized();

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Wrap ETH to receive encrypted cETH
     * @dev ETH deposit amount is visible, but resulting balance is encrypted
     * @dev Max wrap amount is ~18.4 ETH (uint64 max in wei)
     */
    function wrap() external payable nonReentrant {
        if (msg.value == 0) revert ZeroAmount();
        require(msg.value <= type(uint64).max, "Amount exceeds uint64 max");

        // Convert to euint64 (wei amount)
        euint64 amount = FHE.asEuint64(uint64(msg.value));
        FHE.allowThis(amount);

        // Add to encrypted balance
        euint64 currentBalance = _encBalances[msg.sender];
        if (FHE.isInitialized(currentBalance)) {
            _encBalances[msg.sender] = FHE.add(currentBalance, amount);
        } else {
            _encBalances[msg.sender] = amount;
        }

        // Allow user to access their balance
        FHE.allowThis(_encBalances[msg.sender]);
        FHE.allow(_encBalances[msg.sender], msg.sender);

        _totalSupply += msg.value;

        emit Wrap(msg.sender, msg.value);
    }

    /**
     * @notice Unwrap cETH back to ETH
     * @param amount Plaintext amount to unwrap (user reveals this)
     * @dev User chooses when to reveal amount by unwrapping
     */
    function unwrap(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        require(amount <= type(uint64).max, "Amount exceeds uint64 max");

        euint64 currentBalance = _encBalances[msg.sender];
        if (!FHE.isInitialized(currentBalance)) revert InsufficientBalance();

        // Subtract from encrypted balance
        euint64 amountEnc = FHE.asEuint64(uint64(amount));
        _encBalances[msg.sender] = FHE.sub(currentBalance, amountEnc);

        // Re-allow access
        FHE.allowThis(_encBalances[msg.sender]);
        FHE.allow(_encBalances[msg.sender], msg.sender);

        _totalSupply -= amount;

        // Transfer ETH back
        (bool success, ) = msg.sender.call{value: amount}("");
        if (!success) revert UnwrapFailed();

        emit Unwrap(msg.sender, amount);
    }

    /**
     * @notice Transfer encrypted amount to another address
     * @param to Recipient address
     * @param encAmount Encrypted amount handle from user
     * @param proof ZK proof for the encrypted amount
     * @dev Amount is never revealed on-chain
     */
    function transferEncrypted(
        address to,
        externalEuint64 encAmount,
        bytes calldata proof
    ) external nonReentrant {
        _transferEncrypted(msg.sender, to, encAmount, proof);
    }

    /**
     * @notice Transfer encrypted amount on behalf of user (for authorized contracts)
     * @param from Sender address
     * @param to Recipient address
     * @param encAmount Encrypted amount handle
     * @param proof ZK proof for the encrypted amount
     */
    function transferFromEncrypted(
        address from,
        address to,
        externalEuint64 encAmount,
        bytes calldata proof
    ) external nonReentrant {
        if (!_operatorApprovals[from][msg.sender]) revert NotAuthorized();
        _transferEncrypted(from, to, encAmount, proof);
    }

    /**
     * @notice Internal encrypted transfer logic
     */
    function _transferEncrypted(
        address from,
        address to,
        externalEuint64 encAmount,
        bytes calldata proof
    ) internal {
        // Import encrypted amount
        euint64 amount = FHE.fromExternal(encAmount, proof);
        FHE.allowThis(amount);

        // Subtract from sender
        euint64 senderBalance = _encBalances[from];
        if (!FHE.isInitialized(senderBalance)) revert InsufficientBalance();
        _encBalances[from] = FHE.sub(senderBalance, amount);
        FHE.allowThis(_encBalances[from]);
        FHE.allow(_encBalances[from], from);

        // Add to recipient
        euint64 recipientBalance = _encBalances[to];
        if (FHE.isInitialized(recipientBalance)) {
            _encBalances[to] = FHE.add(recipientBalance, amount);
        } else {
            _encBalances[to] = amount;
        }
        FHE.allowThis(_encBalances[to]);
        FHE.allow(_encBalances[to], to);

        emit EncryptedTransfer(from, to);
    }

    /**
     * @notice Transfer using internal encrypted value (for authorized contracts)
     * @param from Sender address
     * @param to Recipient address
     * @param amount Already-imported euint64 amount
     */
    function transferInternal(
        address from,
        address to,
        euint64 amount
    ) external nonReentrant {
        if (!_operatorApprovals[from][msg.sender] && msg.sender != from) revert NotAuthorized();

        // Subtract from sender
        euint64 senderBalance = _encBalances[from];
        if (!FHE.isInitialized(senderBalance)) revert InsufficientBalance();
        _encBalances[from] = FHE.sub(senderBalance, amount);
        FHE.allowThis(_encBalances[from]);
        FHE.allow(_encBalances[from], from);

        // Add to recipient
        euint64 recipientBalance = _encBalances[to];
        if (FHE.isInitialized(recipientBalance)) {
            _encBalances[to] = FHE.add(recipientBalance, amount);
        } else {
            _encBalances[to] = amount;
        }
        FHE.allowThis(_encBalances[to]);
        FHE.allow(_encBalances[to], to);

        emit EncryptedTransfer(from, to);
    }

    /**
     * @notice Approve operator to transfer on your behalf
     * @param operator Address to approve
     * @param approved Approval status
     */
    function setApprovalForAll(address operator, bool approved) external {
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    /**
     * @notice Check if operator is approved
     */
    function isApprovedForAll(address owner, address operator) external view returns (bool) {
        return _operatorApprovals[owner][operator];
    }

    /**
     * @notice Get encrypted balance handle for decryption
     * @param user User address
     * @return Encrypted balance handle
     */
    function balanceOfEncrypted(address user) external view returns (euint64) {
        return _encBalances[user];
    }

    /**
     * @notice Get total supply (plaintext)
     */
    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }

    /**
     * @notice Check if user has initialized balance
     */
    function hasBalance(address user) external view returns (bool) {
        return FHE.isInitialized(_encBalances[user]);
    }

    /**
     * @notice Allow contract to receive ETH
     */
    receive() external payable {}
}
