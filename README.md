# FHE Private Lending Platform

A privacy-preserving lending and credit scoring platform using Fully Homomorphic Encryption (FHE) to protect borrower financial data, credit scores, and loan terms while enabling transparent and fair lending markets.

## 🚀 Features

- **Private Credit Scoring**: Encrypted credit evaluation without revealing financial details
- **Confidential Loan Terms**: Private interest rates and loan amounts
- **Modular Architecture**: Separated concerns with independent upgradeable modules
- **Collateral Management**: 200% collateralization ratio with automated health checks
- **Liquidity Pools**: Decentralized liquidity provision
- **FHE Encryption**: On-chain encrypted computations using Zama fhEVM

## 📁 Project Structure

```
fhe-lending/
├── contracts/              # Smart contracts
│   ├── src/
│   │   ├── FHELendingV2.sol           # Main orchestration contract
│   │   ├── modules/                    # Modular components
│   │   │   ├── CollateralManager.sol  # Collateral deposits/withdrawals
│   │   │   ├── CreditScoring.sol      # Encrypted risk profiles
│   │   │   ├── LoanManager.sol        # Loan requests & approvals
│   │   │   └── LiquidityPool.sol      # Fund management
│   │   └── interfaces/                 # Contract interfaces
│   └── artifacts/                      # Compiled ABIs
├── frontend/               # React + TypeScript UI
│   ├── src/
│   │   ├── pages/                      # Dashboard, Borrow, Supply
│   │   ├── components/                 # UI components (shadcn-ui)
│   │   ├── hooks/                      # React hooks for Web3
│   │   ├── lib/                        # Utilities
│   │   │   └── fhe.ts                 # FHE encryption helpers
│   │   ├── config/                     # Configuration
│   │   │   └── contracts.ts           # Contract addresses
│   │   └── contracts/                  # Contract ABIs
│   └── dist/                           # Built assets
└── README.md
```

## 🛠 Technology Stack

### Smart Contracts
- **Solidity**: ^0.8.28
- **Zama fhEVM**: FHE encryption library
- **OpenZeppelin**: Security patterns (Ownable, ReentrancyGuard)
- **Hardhat**: Development environment

### Frontend
- **React 18**: UI framework
- **TypeScript**: Type safety
- **Vite**: Fast build tool
- **shadcn-ui + Radix UI**: Modern component library
- **Tailwind CSS**: Utility-first styling
- **Wagmi v2 + Viem**: Web3 hooks
- **RainbowKit**: Wallet connection
- **fhevmjs**: Client-side FHE encryption

## 🏗 Contract Architecture

### Main Contract: FHELendingV2
Orchestrates all modules and provides unified user interface.

### Modules

1. **CollateralManager**
   - Deposit/withdraw ETH collateral
   - 200% collateralization enforcement
   - Health factor checks

2. **CreditScoring**
   - Store encrypted risk scores (euint16)
   - Risk score range: 0-65535
   - Approval threshold: ≤ 600

3. **LoanManager**
   - Process encrypted loan requests
   - Encrypted approval logic
   - Debt tracking

4. **LiquidityPool**
   - Manage liquidity providers
   - Loan disbursements
   - Repayment handling

## 📦 Installation & Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- MetaMask or compatible Web3 wallet

### 1. Install Dependencies

**Contracts:**
```bash
cd contracts
npm install
```

**Frontend:**
```bash
cd frontend
npm install
```

### 2. Configure Environment

**Frontend** - Copy `.env.example` to `.env`:
```bash
cd frontend
cp .env.example .env
```

Edit `.env`:
```env
# Contract Addresses (update after deployment)
VITE_FHELENDING_V2_ADDRESS=0x...
VITE_COLLATERAL_MANAGER_ADDRESS=0x...
VITE_CREDIT_SCORING_ADDRESS=0x...
VITE_LOAN_MANAGER_ADDRESS=0x...
VITE_LIQUIDITY_POOL_ADDRESS=0x...

# Network (Sepolia Testnet)
VITE_CHAIN_ID=11155111
VITE_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
VITE_GATEWAY_URL=https://gateway.sepolia.zama.ai

# WalletConnect
VITE_WALLETCONNECT_PROJECT_ID=your_project_id
```

### 3. Compile Contracts

```bash
cd contracts
npm run compile
```

### 4. Deploy Contracts (Sepolia)

```bash
# Set environment variables
export DEPLOYER_PRIVATE_KEY="your_private_key"
export SEPOLIA_RPC_URL="https://ethereum-sepolia-rpc.publicnode.com"

# Deploy
npm run deploy:sepolia
```

### 5. Run Frontend

```bash
cd frontend
npm run dev
```

Visit: http://localhost:8080

## 🔐 How It Works

### User Flow

1. **Deposit Collateral**
   - User deposits ETH as collateral (plaintext)
   - Minimum 200% collateralization required

2. **Submit Credit Profile**
   - User encrypts risk score (0-65535) using FHE
   - Risk score stored as `euint16` on-chain

3. **Request Loan**
   - User submits encrypted loan amount (`euint64`)
   - Contract performs encrypted risk check: `risk ≤ 600`
   - Returns encrypted approval status

4. **Claim Loan**
   - User decrypts approval off-chain
   - Submits plaintext amount to claim
   - Contract verifies collateral ratio
   - Loan disbursed from liquidity pool

5. **Repay**
   - User repays ETH
   - Debt tracking updated
   - Funds returned to liquidity pool

## 🧪 Testing

```bash
cd contracts
npm test
```

## 📄 Contract Addresses (Sepolia)

Update after deployment:

- **FHELendingV2**: `0x...`
- **CollateralManager**: `0x...`
- **CreditScoring**: `0x...`
- **LoanManager**: `0x...`
- **LiquidityPool**: `0x...`

## 🔗 Resources

- [Zama fhEVM Documentation](https://docs.zama.ai/fhevm)
- [Hardhat Documentation](https://hardhat.org/)
- [Wagmi Documentation](https://wagmi.sh/)
- [shadcn-ui](https://ui.shadcn.com/)

## ⚠️ Security Notes

- **Testnet Only**: Not audited for mainnet
- **FHE Limitations**: Current version has limited reencryption support
- **Collateral Risk**: Always maintain >200% collateralization
- **Private Keys**: Never share private keys

## 📝 License

MIT

## 👥 Contributors

Built with Claude Code
