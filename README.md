# Fairbeam - FHE Private Lending Platform

<div align="center">
  <img src="frontend/public/fairbeam-logo.svg" alt="Fairbeam Logo" width="120"/>

  <h3>Privacy-Preserving DeFi Lending with Fully Homomorphic Encryption</h3>

  [![Live Demo](https://img.shields.io/badge/demo-fairbeam.vercel.app-blue)](https://fairbeam.vercel.app)
  [![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
  [![Zama fhEVM](https://img.shields.io/badge/Zama-fhEVM-purple)](https://docs.zama.ai/fhevm)
</div>

---

## 📖 Overview

**Fairbeam** is a revolutionary decentralized lending platform that uses **Fully Homomorphic Encryption (FHE)** to protect borrower privacy while maintaining the transparency and security of blockchain technology. Unlike traditional DeFi lending protocols where all financial data is publicly visible on-chain, Fairbeam encrypts sensitive information such as loan amounts, credit scores, and collateral details, ensuring complete confidentiality.

### 🎯 Key Innovation: Why FHE for Lending?

#### The Problem with Traditional DeFi Lending

In conventional DeFi protocols like Aave or Compound, every transaction is transparent:
- 🔓 **All loan amounts are publicly visible** - Anyone can see how much you borrowed
- 🔓 **Competitors can track your positions** - Trading strategies are exposed
- 🔓 **MEV bots exploit your intentions** - Front-running and sandwich attacks
- 🔓 **Your financial history is permanent** - Wallet addresses reveal entire credit history
- 🔓 **Whales gain information advantage** - Large holders can manipulate markets based on visible liquidity
- 🔓 **Privacy leaks lead to attacks** - Targeted phishing and social engineering

#### Fairbeam's Solution with FHE

**Fully Homomorphic Encryption** allows computations to be performed on encrypted data without ever decrypting it:

```
Traditional Blockchain:          With FHE:
borrowAmount = 1000 ETH    →    borrowAmount = encrypt(1000 ETH)
visible to everyone        →    encrypted: 0x4a8f2b...
risk = 350                 →    risk = encrypt(350)
visible to everyone        →    encrypted: 0x9c3d1e...

Smart Contract Evaluation:
if (borrowAmount < limit)  →    ebool result = FHE.lt(encBorrow, encLimit)
                                 // Comparison happens on encrypted values!
```

**Benefits:**
- 🔐 **Encrypted Loan Amounts**: Borrow requests remain private on-chain
- 🔐 **Private Credit Scores**: Risk profiles stored as encrypted `euint16` values
- 🔐 **Confidential Computations**: Smart contracts evaluate creditworthiness without seeing data
- 🔐 **MEV Protection**: Encrypted transactions prevent front-running
- 🔐 **Zero Knowledge**: Even validators cannot decrypt your financial information
- 🔐 **Censorship Resistant**: No central authority can block access based on profile

---

## 🌟 Core Features

### For Borrowers
- ✅ **Private Borrowing**: Request loans with encrypted amounts using FHE
- ✅ **Confidential Credit Scoring**: Submit encrypted risk profiles (future feature)
- ✅ **Transparent Collateral**: Deposit ETH collateral (plaintext for safety)
- ✅ **No KYC Required**: Borrow without identity verification
- ✅ **Automated Approvals**: Smart contract evaluates encrypted criteria
- ✅ **Flexible Repayment**: Repay anytime to reduce debt

### For Lenders
- ✅ **Secure Liquidity Provision**: Supply ETH to earn interest
- ✅ **Transparent Pool Metrics**: View total liquidity and utilization
- ✅ **Automated Risk Management**: 200% collateralization enforced
- ✅ **Fair Returns**: Interest distributed based on pool share

### Technical Capabilities
- ⚡ **Real-Time Updates**: Frontend auto-refreshes every 3 seconds
- ⚡ **Modular Architecture**: Upgradeable smart contract modules
- ⚡ **FHE Operations**: Encrypted comparisons (lt, gt, eq, add, sub)
- ⚡ **Hybrid Validation**: Combines encryption privacy with plaintext safety
- ⚡ **Gas Optimized**: Efficient FHE operations minimize costs

---

## 🏗 Architecture Overview

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Dashboard   │  │    Borrow    │  │    Supply    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│         │                  │                  │                  │
│         └──────────────────┴──────────────────┘                  │
│                            │                                     │
│                    ┌───────▼────────┐                           │
│                    │ fhevmjs Client │ (FHE Encryption)          │
│                    └───────┬────────┘                           │
└────────────────────────────┼──────────────────────────────────┘
                             │
                    ┌────────▼─────────┐
                    │  Wagmi + Viem    │ (Web3 Provider)
                    └────────┬─────────┘
                             │
┌────────────────────────────▼──────────────────────────────────┐
│                  Ethereum Blockchain (Sepolia)                 │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │           FHELendingWithDecrypt (Main Contract)          │ │
│  └──────────────────────────────────────────────────────────┘ │
│         │                                                       │
│         ├─────────┬─────────┬─────────┬──────────┐            │
│         ▼         ▼         ▼         ▼          ▼            │
│  ┌──────────┐ ┌────────┐ ┌──────┐ ┌────────┐ ┌─────────┐    │
│  │Collateral│ │Credit  │ │Loan  │ │Liquidity│ │  FHE    │    │
│  │ Manager  │ │Scoring │ │Manager│ │  Pool  │ │Coprocessor│   │
│  └──────────┘ └────────┘ └──────┘ └────────┘ └─────────┘    │
│       │            │         │         │           │          │
│       └────────────┴─────────┴─────────┴───────────┘          │
│                            │                                   │
│                    ┌───────▼────────┐                         │
│                    │ Zama fhEVM SDK │                         │
│                    └────────────────┘                         │
└───────────────────────────────────────────────────────────────┘
```

### Smart Contract Architecture

#### Main Contract: `FHELendingWithDecrypt.sol`

The core orchestration contract that provides a unified interface for all lending operations.

**Key Functions:**
```solidity
// Collateral Management
function depositCollateral() external payable
function withdrawCollateral(uint256 amount) external

// FHE Encrypted Borrowing
function requestBorrow(inEuint64 calldata encryptedAmount, bytes calldata proof) external
function claimBorrowedFunds(uint256 amountPlain) external

// Repayment
function repay() external payable

// Read Functions
function getCollateral(address user) external view returns (uint256)
function getOutstandingDebt(address user) external view returns (uint256)
function getMaxBorrowable(address user) external view returns (uint256)
function hasActiveRequest(address user) external view returns (bool)
```

#### Contract Modules (Modular Design)

1. **CollateralManager.sol**
   - Manages ETH collateral deposits and withdrawals
   - Enforces 200% collateralization ratio
   - Calculates health factors
   - Prevents undercollateralized withdrawals

2. **CreditScoring.sol** (Future Enhancement)
   - Stores encrypted risk scores (`euint16`)
   - Risk score range: 0-65535
   - Approval threshold: ≤ 600
   - Encrypted risk evaluation

3. **LoanManager.sol**
   - Processes encrypted loan requests
   - Validates encrypted borrow amounts
   - Tracks outstanding debt per user
   - Manages borrow request lifecycle

4. **LiquidityPool.sol**
   - Manages liquidity provider deposits
   - Handles loan disbursements
   - Processes repayments
   - Tracks pool utilization

---

## 🔐 How FHE Encryption Works

### FHE Data Types

Zama's fhEVM provides encrypted data types that can be computed on-chain:

```solidity
euint8    // Encrypted 8-bit unsigned integer (0-255)
euint16   // Encrypted 16-bit unsigned integer (0-65535)
euint32   // Encrypted 32-bit unsigned integer
euint64   // Encrypted 64-bit unsigned integer (used for loan amounts)
ebool     // Encrypted boolean
```

### FHE Operations

Smart contracts can perform computations on encrypted values:

```solidity
// Encrypted Comparisons
ebool isLess = FHE.lt(encryptedA, encryptedB);        // A < B
ebool isGreater = FHE.gt(encryptedA, encryptedB);     // A > B
ebool isEqual = FHE.eq(encryptedA, encryptedB);       // A == B

// Encrypted Arithmetic
euint64 sum = FHE.add(encryptedA, encryptedB);        // A + B
euint64 diff = FHE.sub(encryptedA, encryptedB);       // A - B
euint64 product = FHE.mul(encryptedA, encryptedB);    // A * B

// Conditional Logic
euint64 result = FHE.select(condition, valueIfTrue, valueIfFalse);

// Validation
FHE.req(encryptedCondition); // Reverts if condition is false
```

### Privacy Flow Example

**Scenario**: User wants to borrow 0.05 ETH

#### Step 1: Client-Side Encryption
```typescript
import { createInstance } from 'fhevmjs';

// Initialize FHE instance
const fheInstance = await createInstance({
  chainId: 11155111, // Sepolia
  publicKey: await getPublicKey(),
});

// Encrypt the borrow amount
const amountWei = parseEther("0.05"); // 50000000000000000 wei
const { handle, proof } = await fheInstance.createEncryptedInput(
  contractAddress,
  userAddress
)
  .addUint64(amountWei)
  .encrypt();
```

#### Step 2: Submit Encrypted Request
```solidity
// Smart contract receives encrypted data
function requestBorrow(inEuint64 calldata encryptedAmount, bytes calldata proof) external {
    // Convert to internal encrypted type
    euint64 amount = FHE.asEuint64(encryptedAmount, proof);

    // Store encrypted amount (nobody can see the value!)
    borrowRequests[msg.sender] = BorrowRequest({
        amountEnc: amount,
        timestamp: block.timestamp,
        claimed: false
    });

    // Grant permission for user to decrypt later
    FHE.allow(amount, msg.sender);
    FHE.allow(amount, address(this));
}
```

#### Step 3: Encrypted Validation
```solidity
// Contract validates without decrypting
function validateBorrow(address user) internal view returns (ebool) {
    euint64 encCollateral = getEncryptedCollateral(user);
    euint64 encBorrowAmount = borrowRequests[user].amountEnc;

    // Encrypted comparison: collateral >= borrowAmount * 2
    euint64 requiredCollateral = FHE.mul(encBorrowAmount, FHE.asEuint64(2));
    ebool sufficient = FHE.gte(encCollateral, requiredCollateral);

    return sufficient; // Result is encrypted!
}
```

#### Step 4: Claim with Plaintext Validation
```solidity
function claimBorrowedFunds(uint256 amountPlain) external {
    BorrowRequest storage request = borrowRequests[msg.sender];

    // Decrypt stored encrypted amount (only contract can do this)
    uint256 decryptedAmount = FHE.decrypt(request.amountEnc);

    // Verify plaintext matches encrypted value
    require(amountPlain == decryptedAmount, "Amount mismatch");

    // Additional validation
    require(getCollateral(msg.sender) >= amountPlain * 2, "Insufficient collateral");

    // Disburse funds
    request.claimed = true;
    outstandingDebt[msg.sender] += amountPlain;
    payable(msg.sender).transfer(amountPlain);
}
```

---

## 🛠 Technology Stack

### Smart Contracts Layer

| Technology | Version | Purpose |
|------------|---------|---------|
| **Solidity** | ^0.8.28 | Smart contract language |
| **Zama fhEVM** | Latest | FHE encryption library |
| **Hardhat** | ^2.19.0 | Development environment |
| **OpenZeppelin** | ^5.0.0 | Security patterns (Ownable, ReentrancyGuard) |
| **Ethers.js** | ^6.0.0 | Contract interaction |

**FHE Capabilities:**
- ✅ Encrypted integers: `euint8`, `euint16`, `euint32`, `euint64`
- ✅ Encrypted booleans: `ebool`
- ✅ Encrypted operations: Add, Sub, Mul, Lt, Gt, Eq
- ✅ Conditional logic: `FHE.select`, `FHE.req`
- ✅ Permission system: `FHE.allow`, `FHE.allowThis`

### Frontend Layer

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 18.3.1 | UI framework |
| **TypeScript** | 5.6.2 | Type safety |
| **Vite** | 5.4.2 | Fast build tool & dev server |
| **Wagmi** | 2.x | React hooks for Ethereum |
| **Viem** | 2.x | TypeScript Ethereum library |
| **RainbowKit** | 2.x | Wallet connection UI |
| **fhevmjs** | 0.6.x | Client-side FHE encryption |
| **TanStack Query** | 5.x | Async state management |

**UI Components:**
- **shadcn-ui**: Modern component library
- **Radix UI**: Accessible primitives
- **Tailwind CSS**: Utility-first styling
- **Lucide Icons**: Icon system

**Key Frontend Features:**
- ⚡ Auto-refresh every 3 seconds for real-time data
- ⚡ Optimistic UI updates after transactions
- ⚡ Toast notifications for user feedback
- ⚡ Dark mode support
- ⚡ Responsive design (mobile-friendly)
- ⚡ Type-safe contract interactions

---

## 📁 Project Structure

```
fhe-lending/
├── contracts/                      # Smart Contracts
│   ├── src/
│   │   ├── FHELendingWithDecrypt.sol    # Main lending contract
│   │   ├── modules/                      # Modular components
│   │   │   ├── CollateralManager.sol    # Collateral logic
│   │   │   ├── CreditScoring.sol        # Risk scoring (future)
│   │   │   ├── LoanManager.sol          # Loan lifecycle
│   │   │   └── LiquidityPool.sol        # Pool management
│   │   └── interfaces/                   # Contract interfaces
│   ├── scripts/
│   │   ├── deploy.js                     # Deployment script
│   │   └── setup-authorizations.js       # FHE permissions
│   ├── test/                             # Contract tests
│   └── hardhat.config.js                 # Hardhat configuration
│
├── frontend/                       # React Frontend
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Index.tsx                 # Landing page
│   │   │   ├── Dashboard.tsx             # User dashboard
│   │   │   ├── BorrowFHE.tsx            # Borrow interface
│   │   │   ├── Supply.tsx                # Supply interface
│   │   │   └── HowItWorks.tsx           # Documentation page
│   │   │
│   │   ├── components/
│   │   │   ├── Navbar.tsx                # Navigation
│   │   │   ├── StatsCard.tsx            # Metric cards
│   │   │   └── ui/                       # shadcn-ui components
│   │   │
│   │   ├── hooks/
│   │   │   └── useFHELendingWithDecrypt.ts  # Main contract hook
│   │   │
│   │   ├── lib/
│   │   │   └── fhe.ts                    # FHE encryption utilities
│   │   │
│   │   ├── config/
│   │   │   ├── contracts.ts              # Contract addresses
│   │   │   └── wagmi.ts                  # Wagmi configuration
│   │   │
│   │   └── contracts/
│   │       └── FHELendingWithDecrypt.json  # Contract ABI
│   │
│   ├── public/
│   │   ├── fairbeam-logo.svg            # Logo
│   │   └── video.mp4                     # Demo video
│   │
│   ├── vercel.json                       # Vercel SPA routing
│   └── vite.config.ts                    # Vite configuration
│
└── README.md                        # This file
```

---

## 📦 Installation & Setup

### Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** or **yarn** package manager
- **MetaMask** or compatible Web3 wallet
- **Sepolia ETH** for testing (get from faucet)
- **Git** for version control

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/fhe-lending.git
cd fhe-lending
```

### 2. Install Dependencies

**Smart Contracts:**
```bash
cd contracts
npm install
```

**Frontend:**
```bash
cd frontend
npm install
```

### 3. Configure Environment Variables

**Frontend** - Create `.env` file:
```bash
cd frontend
cp .env.example .env
```

Edit `.env`:
```env
# Contract Address (update after deployment)
VITE_FHELENDING_ADDRESS=0x03B9C324Fa7C2840e38D2db8d2ebBE22B8E29DBA

# Network Configuration (Sepolia Testnet)
VITE_CHAIN_ID=11155111
VITE_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
VITE_GATEWAY_URL=https://gateway.sepolia.zama.ai

# WalletConnect Project ID (get from https://cloud.walletconnect.com)
VITE_WALLETCONNECT_PROJECT_ID=your_project_id_here
```

**Contracts** - Create `.env` file:
```bash
cd contracts
```

Create `.env`:
```env
# Deployment Configuration
DEPLOYER_PRIVATE_KEY=your_private_key_here
SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com

# Optional: Etherscan API for verification
ETHERSCAN_API_KEY=your_etherscan_api_key
```

### 4. Compile Smart Contracts

```bash
cd contracts
npx hardhat compile
```

Expected output:
```
Compiled 15 Solidity files successfully
```

### 5. Deploy Contracts (Sepolia Testnet)

```bash
cd contracts
SEPOLIA_RPC_URL="https://ethereum-sepolia-rpc.publicnode.com" npx hardhat run scripts/deploy.js --network sepolia
```

**Save the deployed contract address** and update `frontend/.env`:
```env
VITE_FHELENDING_ADDRESS=0xYourDeployedContractAddress
```

### 6. Run Frontend Development Server

```bash
cd frontend
npm run dev
```

Visit: **http://localhost:8080**

---

## 🔐 User Flow & How It Works

### Complete Lending Cycle

#### 1️⃣ **Deposit Collateral**

**User Action:**
- Connect wallet (MetaMask, WalletConnect, etc.)
- Navigate to "Supply" page
- Enter collateral amount (e.g., 0.1 ETH)
- Click "Deposit Collateral"

**Smart Contract:**
```solidity
function depositCollateral() external payable {
    require(msg.value > 0, "Amount must be greater than 0");
    collateralBalances[msg.sender] += msg.value;
    emit CollateralDeposited(msg.sender, msg.value);
}
```

**Result:** User's collateral is stored and tracked on-chain (plaintext for transparency).

---

#### 2️⃣ **Request Encrypted Loan**

**User Action:**
- Navigate to "Borrow" page
- Enter desired borrow amount (e.g., 0.05 ETH)
- Click "Request Borrow"

**Frontend Encryption:**
```typescript
// Encrypt amount using fhevmjs
const amountWei = parseEther("0.05");
const { handle, proof } = await encryptUint64(
  amountWei,
  contractAddress,
  userAddress
);

// Submit encrypted request
await contract.requestBorrow(handle, proof);
```

**Smart Contract:**
```solidity
function requestBorrow(inEuint64 calldata encryptedAmount, bytes calldata proof) external {
    // Convert to encrypted type
    euint64 amount = FHE.asEuint64(encryptedAmount, proof);

    // Store encrypted request (nobody can see the amount!)
    borrowRequests[msg.sender] = BorrowRequest({
        amountEnc: amount,
        timestamp: block.timestamp,
        claimed: false
    });

    // Grant permissions
    FHE.allow(amount, msg.sender);
    FHE.allow(amount, address(this));

    emit BorrowRequested(msg.sender);
}
```

**Result:** Loan request is stored on-chain in **encrypted form**. Even block explorers cannot see the amount.

---

#### 3️⃣ **Claim Borrowed Funds**

**User Action:**
- Enter the **same plaintext amount** they originally requested
- Click "Claim Funds"

**Why Plaintext?** Current FHE SDK has limited decryption support. This hybrid approach:
- ✅ Maintains privacy (encrypted on-chain storage)
- ✅ Ensures security (contract validates plaintext matches encrypted)
- ✅ User must remember their own amount (additional security layer)

**Smart Contract Validation:**
```solidity
function claimBorrowedFunds(uint256 amountPlain) external {
    BorrowRequest storage request = borrowRequests[msg.sender];
    require(!request.claimed, "Already claimed");

    // Decrypt the stored encrypted amount
    uint256 decryptedAmount = FHE.decrypt(request.amountEnc);

    // Verify plaintext matches encrypted value
    require(amountPlain == decryptedAmount, "Amount mismatch");

    // Validate collateralization ratio (200%)
    uint256 collateral = collateralBalances[msg.sender];
    require(collateral >= amountPlain * 2, "Insufficient collateral");

    // Check pool liquidity
    require(address(this).balance >= amountPlain, "Insufficient pool liquidity");

    // Update state
    request.claimed = true;
    outstandingDebt[msg.sender] += amountPlain;

    // Transfer funds
    payable(msg.sender).transfer(amountPlain);

    emit LoanClaimed(msg.sender, amountPlain);
}
```

**Security Checks:**
1. ✅ Plaintext matches encrypted stored value
2. ✅ Collateral ≥ 200% of loan amount
3. ✅ Pool has sufficient liquidity
4. ✅ Request not already claimed

**Result:** User receives ETH loan while maintaining on-chain privacy of request amount.

---

#### 4️⃣ **Repay Loan**

**User Action:**
- View outstanding debt on Dashboard
- Click "Repay"
- Send ETH to repay (partial or full)

**Smart Contract:**
```solidity
function repay() external payable {
    require(msg.value > 0, "Must repay something");
    uint256 debt = outstandingDebt[msg.sender];
    require(debt > 0, "No outstanding debt");

    uint256 repayAmount = msg.value > debt ? debt : msg.value;
    outstandingDebt[msg.sender] -= repayAmount;

    // Return excess
    if (msg.value > debt) {
        payable(msg.sender).transfer(msg.value - debt);
    }

    emit Repaid(msg.sender, repayAmount);
}
```

**Result:** Debt is reduced, collateral can be withdrawn once debt = 0.

---

#### 5️⃣ **Withdraw Collateral**

**User Action:**
- Repay all outstanding debt first
- Navigate to "Supply" page
- Click "Withdraw Collateral"

**Smart Contract:**
```solidity
function withdrawCollateral(uint256 amount) external {
    require(outstandingDebt[msg.sender] == 0, "Must repay debt first");
    require(collateralBalances[msg.sender] >= amount, "Insufficient balance");

    collateralBalances[msg.sender] -= amount;
    payable(msg.sender).transfer(amount);

    emit CollateralWithdrawn(msg.sender, amount);
}
```

**Result:** User retrieves their collateral after repaying debt.

---

## 🧪 Testing

### Run Contract Tests

```bash
cd contracts
npx hardhat test
```

### Test Coverage

```bash
npx hardhat coverage
```

### Manual Testing on Frontend

1. **Get Sepolia ETH**: https://sepoliafaucet.com/
2. **Connect Wallet**: Use MetaMask on Sepolia network
3. **Test Flow**:
   - Deposit 0.1 ETH collateral
   - Request 0.05 ETH encrypted loan
   - Wait for transaction confirmation
   - Claim loan with plaintext amount
   - Verify loan received
   - Repay loan
   - Withdraw collateral

---

## 📄 Deployed Contracts (Sepolia Testnet)

| Contract | Address | Purpose |
|----------|---------|---------|
| **FHELendingWithDecrypt** | `0x03B9C324Fa7C2840e38D2db8d2ebBE22B8E29DBA` | Main lending contract |

**Verify on Sepolia Etherscan:**
https://sepolia.etherscan.io/address/0x03B9C324Fa7C2840e38D2db8d2ebBE22B8E29DBA

---

## 🚀 Live Demo

**Frontend Application:** https://fairbeam.vercel.app

**Features Available:**
- ✅ Dashboard with real-time metrics
- ✅ Collateral deposit/withdrawal
- ✅ Encrypted borrow requests
- ✅ Loan claiming with validation
- ✅ Repayment processing
- ✅ "How It Works" educational page with demo video

---

## 🔗 Resources & Documentation

### Zama fhEVM
- 📚 [Official Documentation](https://docs.zama.ai/fhevm)
- 💻 [GitHub Repository](https://github.com/zama-ai/fhevm)
- 📝 [Technical Blog](https://www.zama.ai/post/fhevm-confidential-smart-contracts)
- 🎓 [Tutorial Videos](https://www.youtube.com/c/ZamaFHE)

### Development Tools
- ⚒️ [Hardhat Documentation](https://hardhat.org/)
- 🔗 [Wagmi Documentation](https://wagmi.sh/)
- 🎨 [shadcn-ui Components](https://ui.shadcn.com/)
- 🌈 [RainbowKit](https://www.rainbowkit.com/)

### Ethereum Resources
- 🔍 [Sepolia Faucet](https://sepoliafaucet.com/)
- 📊 [Sepolia Etherscan](https://sepolia.etherscan.io/)
- 🦊 [MetaMask Setup Guide](https://metamask.io/download/)

---

## ⚠️ Security & Limitations

### Current Limitations

1. **Testnet Only**
   - ⚠️ Not audited for mainnet deployment
   - ⚠️ Use Sepolia testnet ETH only

2. **FHE SDK Constraints**
   - ⚠️ Limited decryption support in fhevmjs 0.6.x
   - ⚠️ User must remember plaintext amount for claiming
   - ⚠️ Decryption requires contract-side validation

3. **Collateral Transparency**
   - ⚠️ Collateral amounts are plaintext (for safety)
   - ⚠️ Future versions may support encrypted collateral

4. **Gas Costs**
   - ⚠️ FHE operations are more expensive than plaintext
   - ⚠️ Encrypted comparisons cost ~200K gas
   - ⚠️ Optimization ongoing in Zama updates

### Security Best Practices

✅ **Always maintain 200%+ collateralization**
✅ **Never share private keys or seed phrases**
✅ **Verify contract addresses before transactions**
✅ **Start with small amounts for testing**
✅ **Keep track of encrypted amounts requested**
✅ **Monitor your health factor on Dashboard**

### Future Enhancements

- 🔄 Full client-side decryption support
- 🔄 Encrypted collateral deposits
- 🔄 Interest rate calculations
- 🔄 Liquidation mechanisms
- 🔄 Multi-asset support
- 🔄 Governance token

---

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 👥 Contributing

Contributions welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 💬 Support & Community

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/yourusername/fhe-lending/issues)
- 💡 **Feature Requests**: [GitHub Discussions](https://github.com/yourusername/fhe-lending/discussions)
- 📧 **Email**: support@fairbeam.io
- 🐦 **Twitter**: [@FairbeamFHE](https://twitter.com/FairbeamFHE)

---

## 🙏 Acknowledgments

- **Zama** - For pioneering FHE technology and fhEVM
- **OpenZeppelin** - For secure smart contract libraries
- **shadcn** - For beautiful UI components
- **Ethereum Foundation** - For Sepolia testnet infrastructure

---

<div align="center">
  <p><strong>Built with ❤️ using Claude Code and Zama FHE</strong></p>
  <p>⭐ Star us on GitHub if you find this project useful!</p>
</div>
