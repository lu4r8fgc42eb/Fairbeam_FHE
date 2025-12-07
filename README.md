# Fairbeam

<div align="center">
  <img src="frontend/public/fairbeam-logo.svg" alt="Fairbeam Logo" width="120"/>

  <h3>Fully Private DeFi Lending with Homomorphic Encryption</h3>

  [![Live Demo](https://img.shields.io/badge/demo-fairbeam.vercel.app-blue)](https://fairbeam.vercel.app)
  [![Solidity](https://img.shields.io/badge/Solidity-^0.8.28-363636)](https://soliditylang.org/)
  [![Zama fhEVM](https://img.shields.io/badge/Zama-fhEVM_0.9.1-purple)](https://docs.zama.ai/fhevm)
  [![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
</div>

---

## Overview

**Fairbeam** is a privacy-preserving DeFi lending protocol built on Zama's fhEVM (Fully Homomorphic Encryption Virtual Machine). Unlike traditional DeFi protocols where all financial data is publicly visible on-chain, Fairbeam encrypts **all user amounts** - collateral, borrows, debts, and repayments - ensuring complete financial privacy while maintaining trustless smart contract execution.

### The Privacy Problem in DeFi

Traditional DeFi lending protocols expose sensitive financial information:

| Data Point | Traditional DeFi | Fairbeam |
|------------|------------------|----------|
| Collateral Amount | Visible | Encrypted |
| Borrow Amount | Visible | Encrypted |
| Debt Balance | Visible | Encrypted |
| Repayment Amount | Visible | Encrypted |
| Credit Score | N/A | Encrypted |

This transparency creates risks: competitors tracking positions, MEV bots exploiting intentions, and permanent financial history exposure.

### Fairbeam's Solution

Fairbeam introduces **Confidential ETH (cETH)** - a wrapped ETH token with encrypted balances. All lending operations use cETH, ensuring that:

1. **Collateral deposits** are encrypted (only the user knows the amount)
2. **Borrow amounts** are encrypted (loan sizes are private)
3. **Debt balances** are encrypted (outstanding loans are hidden)
4. **Repayments** are encrypted (debt reduction is private)

---

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Frontend (React + Vite)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │ Dashboard │  │   Wrap   │  │  Supply  │  │  Borrow  │            │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘            │
│                              │                                       │
│                    ┌─────────▼─────────┐                            │
│                    │ Wagmi + RainbowKit │                           │
│                    └─────────┬─────────┘                            │
└──────────────────────────────┼──────────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────────┐
│                    Ethereum (Sepolia Testnet)                        │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                    ConfidentialETH (cETH)                       │ │
│  │  • wrap() - ETH → encrypted cETH                               │ │
│  │  • unwrap() - cETH → ETH                                       │ │
│  │  • transferEncrypted() - Private transfers                     │ │
│  │  • transferInternal() - Pool operations                        │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                              │                                       │
│  ┌────────────────────────────▼───────────────────────────────────┐ │
│  │                    PrivateLendingPool                           │ │
│  │  • depositCollateral() - Encrypted collateral                  │ │
│  │  • withdrawCollateral() - Encrypted withdrawal                 │ │
│  │  • borrow() - Encrypted loan                                   │ │
│  │  • repay() - Encrypted repayment                               │ │
│  │  • supply() - Encrypted liquidity provision                    │ │
│  │  • withdrawSupply() - Encrypted withdrawal                     │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                              │                                       │
│                    ┌─────────▼─────────┐                            │
│                    │  Zama fhEVM SDK   │                            │
│                    │  FHE Coprocessor  │                            │
│                    └───────────────────┘                            │
└──────────────────────────────────────────────────────────────────────┘
```

### Smart Contract Architecture

#### ConfidentialETH (cETH)

Wrapped ETH token with encrypted balances for privacy-preserving transfers.

```solidity
contract ConfidentialETH {
    mapping(address => euint64) private _encBalances;  // Encrypted balances

    function wrap() external payable;                   // ETH → cETH
    function unwrap(uint256 amount) external;           // cETH → ETH
    function transferEncrypted(                         // Private transfer
        address to,
        externalEuint64 encAmount,
        bytes calldata proof
    ) external;
    function transferInternal(                          // Internal (pool) transfer
        address from,
        address to,
        euint64 amount
    ) external;
}
```

**Privacy Model:**
- `wrap()`: Initial ETH deposit is visible (unavoidable), but cETH balance becomes encrypted
- `transferEncrypted()`: Amount transferred is fully encrypted on-chain
- `unwrap()`: User chooses when to reveal amount by unwrapping

#### PrivateLendingPool

Fully private lending pool where all operations use encrypted amounts.

```solidity
contract PrivateLendingPool {
    mapping(address => euint64) private _encCollateral;  // Encrypted collateral
    mapping(address => euint64) private _encDebt;        // Encrypted debt
    mapping(address => euint64) private _encSupplied;    // Encrypted supply

    uint256 public constant COLLATERAL_RATIO = 200;      // 200% = 50% LTV

    // All functions accept encrypted amounts
    function depositCollateral(externalEuint64 encAmount, bytes calldata proof) external;
    function withdrawCollateral(externalEuint64 encAmount, bytes calldata proof) external;
    function borrow(externalEuint64 encAmount, bytes calldata proof) external;
    function repay(externalEuint64 encAmount, bytes calldata proof) external;
    function supply(externalEuint64 encAmount, bytes calldata proof) external;
    function withdrawSupply(externalEuint64 encAmount, bytes calldata proof) external;
}
```

**Key Features:**
- **Encrypted Collateral Ratio Checks**: Uses `FHE.mul()` and `FHE.ge()` for encrypted comparisons
- **Privacy-Preserving Events**: Events emit only addresses, never amounts
- **FHE Permission System**: Uses `FHE.allow()` to grant encrypted value access

---

## How FHE Works

### Encrypted Data Types

Zama's fhEVM provides encrypted integers that can be computed on-chain:

```solidity
euint64   // Encrypted 64-bit integer (used for token amounts in wei)
ebool     // Encrypted boolean (used for comparisons)
```

### FHE Operations in Fairbeam

```solidity
// Importing encrypted values from user input
euint64 amount = FHE.fromExternal(encAmount, proof);

// Encrypted arithmetic
euint64 newBalance = FHE.add(currentBalance, amount);
euint64 newDebt = FHE.sub(currentDebt, repayment);

// Encrypted comparisons (for collateral ratio checks)
euint64 collateralScaled = FHE.mul(collateral, FHE.asEuint64(100));
euint64 debtScaled = FHE.mul(debt, FHE.asEuint64(200));
ebool sufficient = FHE.ge(collateralScaled, debtScaled);

// Permission management
FHE.allowThis(amount);           // Allow this contract
FHE.allow(amount, msg.sender);   // Allow user to decrypt
FHE.allow(amount, address(cETH)); // Allow cETH contract
```

### Privacy Flow

1. **User encrypts amount client-side** using fhevmjs
2. **Encrypted value + proof submitted** to smart contract
3. **Contract imports and validates** using `FHE.fromExternal()`
4. **Operations performed on encrypted values** without decryption
5. **User can decrypt their own values** using Gateway decryption

---

## User Flow

### Complete Lending Cycle

```
┌─────────────────────────────────────────────────────────────────┐
│  1. WRAP ETH → cETH                                              │
│     User deposits ETH, receives encrypted cETH balance           │
│     cETH.wrap{value: 0.1 ether}()                               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  2. APPROVE POOL                                                 │
│     Allow PrivateLendingPool to transfer cETH                   │
│     cETH.setApprovalForAll(poolAddress, true)                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  3. DEPOSIT COLLATERAL (Encrypted)                               │
│     Deposit encrypted cETH as collateral                        │
│     pool.depositCollateral(encAmount, proof)                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  4. BORROW (Encrypted)                                           │
│     Borrow encrypted cETH against collateral (50% LTV)          │
│     pool.borrow(encAmount, proof)                               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  5. REPAY (Encrypted)                                            │
│     Repay encrypted debt amount                                 │
│     pool.repay(encAmount, proof)                                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  6. WITHDRAW COLLATERAL (Encrypted)                              │
│     Withdraw encrypted collateral after repayment               │
│     pool.withdrawCollateral(encAmount, proof)                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  7. UNWRAP cETH → ETH                                            │
│     Convert cETH back to ETH (reveals amount)                   │
│     cETH.unwrap(amount)                                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Smart Contracts

| Package | Version | Purpose |
|---------|---------|---------|
| **Solidity** | ^0.8.28 | Smart contract language |
| **@fhevm/solidity** | ^0.9.1 | Zama FHE library |
| **@openzeppelin/contracts** | ^5.4.0 | Security patterns (Ownable, ReentrancyGuard) |
| **Hardhat** | ^2.26.0 | Development framework |
| **@fhevm/hardhat-plugin** | ^0.3.0-1 | fhEVM Hardhat integration |

### Frontend

| Package | Version | Purpose |
|---------|---------|---------|
| **React** | ^18.3.1 | UI framework |
| **TypeScript** | ^5.8.3 | Type safety |
| **Vite** | ^5.4.19 | Build tool |
| **Wagmi** | ^2.18.2 | React Ethereum hooks |
| **Viem** | ^2.38.4 | Ethereum library |
| **RainbowKit** | ^2.2.9 | Wallet connection |
| **TanStack Query** | ^5.90.5 | Async state management |
| **Tailwind CSS** | ^3.4.17 | Styling |
| **shadcn/ui** | Latest | UI components |

---

## Project Structure

```
Fairbeam/
├── contracts/                          # Smart Contracts
│   ├── ConfidentialETH.sol            # cETH wrapper token
│   ├── PrivateLendingPool.sol         # Main lending pool
│   ├── interfaces/                     # Contract interfaces
│   └── modules/                        # Legacy modular contracts
│
├── scripts/                            # Deployment scripts
│   ├── deploy-private-lending.js      # Deploy V2 contracts
│   └── deploy-fhe-with-decrypt.js     # Deploy V1 contracts
│
├── test/                               # Contract tests
│   ├── FHEEncryption.test.js          # FHE operation tests
│   ├── FHELending.test.js             # Lending logic tests
│   ├── CollateralManager.test.js      # Collateral tests
│   ├── LiquidityPool.test.js          # Pool tests
│   └── SecurityTests.test.js          # Security tests
│
├── frontend/                           # React Frontend
│   ├── src/
│   │   ├── pages/                     # Route pages
│   │   │   ├── Dashboard.tsx          # User dashboard
│   │   │   ├── Wrap.tsx               # Wrap/Unwrap cETH
│   │   │   ├── Supply.tsx             # Supply liquidity
│   │   │   ├── Borrow.tsx             # Borrow interface
│   │   │   └── HowItWorks.tsx         # Documentation
│   │   ├── hooks/                     # React hooks
│   │   │   ├── useConfidentialETH.ts  # cETH operations
│   │   │   └── usePrivateLendingPool.ts # Pool operations
│   │   ├── contracts/                 # ABIs
│   │   │   ├── ConfidentialETH.json
│   │   │   └── PrivateLendingPool.json
│   │   └── config/
│   │       ├── contracts.ts           # Contract addresses
│   │       └── wagmi.ts               # Wagmi configuration
│   └── package.json
│
├── deployments/                        # Deployment records
│   └── sepolia-private-lending.json
│
├── hardhat.config.js                   # Hardhat configuration
├── package.json                        # Dependencies
└── README.md
```

---

## Installation

### Prerequisites

- Node.js 18+
- npm or yarn
- MetaMask or compatible wallet
- Sepolia ETH ([Faucet](https://sepoliafaucet.com/))

### Setup

```bash
# Clone repository
git clone https://github.com/yourusername/Fairbeam.git
cd Fairbeam

# Install contract dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
```

### Environment Configuration

**Root `.env`:**
```env
DEPLOYER_PRIVATE_KEY=your_private_key
SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
ETHERSCAN_API_KEY=your_etherscan_key  # Optional
```

**Frontend `.env`:**
```env
VITE_CETH_ADDRESS=0xDC13A2f7fED5d396Efe5ce86F3AC0eCb2CA46643
VITE_PRIVATE_LENDING_POOL_ADDRESS=0x1de445720AeFfCaf4ba0c055071AC891ef866133
VITE_CHAIN_ID=11155111
VITE_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
VITE_GATEWAY_URL=https://gateway.sepolia.zama.ai
```

---

## Development

### Compile Contracts

```bash
npm run compile
```

### Run Tests

```bash
npm run test
```

### Deploy to Sepolia

```bash
npm run deploy:private
```

### Run Frontend

```bash
cd frontend
npm run dev
```

---

## Deployed Contracts (Sepolia)

| Contract | Address |
|----------|---------|
| **ConfidentialETH (cETH)** | `0xDC13A2f7fED5d396Efe5ce86F3AC0eCb2CA46643` |
| **PrivateLendingPool** | `0x1de445720AeFfCaf4ba0c055071AC891ef866133` |

**Verify on Etherscan:**
- [ConfidentialETH](https://sepolia.etherscan.io/address/0xDC13A2f7fED5d396Efe5ce86F3AC0eCb2CA46643)
- [PrivateLendingPool](https://sepolia.etherscan.io/address/0x1de445720AeFfCaf4ba0c055071AC891ef866133)

---

## Testing

### Test Categories

| Test File | Coverage |
|-----------|----------|
| `FHEEncryption.test.js` | FHE encryption/decryption operations |
| `FHELending.test.js` | Core lending logic |
| `CollateralManager.test.js` | Collateral deposit/withdrawal |
| `LiquidityPool.test.js` | Liquidity provision |
| `SecurityTests.test.js` | Reentrancy, access control |

### Running Tests

```bash
# Run all tests
npm run test

# Run specific test
npx hardhat test test/FHELending.test.js
```

---

## Security Considerations

### Implemented Security

- **ReentrancyGuard**: All state-changing functions protected
- **Ownable**: Admin functions restricted
- **FHE Permissions**: Strict access control for encrypted values
- **Proof Validation**: Single-use proofs prevent replay attacks

### Limitations

- **Testnet Only**: Not audited for mainnet
- **FHE Gas Costs**: Encrypted operations are more expensive
- **Wrap Visibility**: Initial ETH→cETH wrap amount is visible

### Best Practices

1. Always maintain 200%+ collateralization
2. Keep track of your encrypted amounts
3. Start with small amounts for testing
4. Verify contract addresses before transactions

---

## Resources

- [Zama fhEVM Documentation](https://docs.zama.ai/fhevm)
- [fhEVM GitHub](https://github.com/zama-ai/fhevm)
- [Hardhat Documentation](https://hardhat.org/)
- [Sepolia Faucet](https://sepoliafaucet.com/)

---

## License

MIT License - see [LICENSE](LICENSE)

---

<div align="center">
  <p><strong>Built with Zama FHE Technology</strong></p>
  <p>
    <a href="https://fairbeam.vercel.app">Live Demo</a> |
    <a href="https://docs.zama.ai/fhevm">fhEVM Docs</a>
  </p>
</div>
