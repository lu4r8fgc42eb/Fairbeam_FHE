# Fairbeam Test Suite

Comprehensive unit tests for the FHE Private Lending Platform.

## 📋 Test Coverage

### 1. FHELending.test.js
Core lending functionality tests covering:
- ✅ Collateral deposit and withdrawal
- ✅ Liquidity pool management
- ✅ Borrowing calculations (max borrowable, health factor)
- ✅ Debt tracking
- ✅ Repayment logic
- ✅ Access control
- ✅ Edge cases (small deposits, multiple users)
- ✅ Event emissions
- ✅ Contract state consistency

**Test Count:** 20+ tests

### 2. FHEEncryption.test.js
FHE encryption and privacy features:
- ✅ Encrypted borrow request structure
- ✅ Claim validation logic
- ✅ FHE permission system
- ✅ Data privacy guarantees
- ✅ Hybrid validation approach
- ✅ Integration with collateral/liquidity systems
- ✅ Gas optimization checks
- ✅ Event privacy verification

**Test Count:** 15+ tests

### 3. SecurityTests.test.js
Security and attack vector protection:
- ✅ Reentrancy protection
- ✅ Access control isolation
- ✅ Integer overflow/underflow prevention
- ✅ Denial of Service resistance
- ✅ Front-running protection via FHE
- ✅ Collateralization enforcement
- ✅ State consistency
- ✅ Input validation
- ✅ Privacy guarantees
- ✅ Emergency scenarios

**Test Count:** 25+ tests

**Total Tests:** 60+ comprehensive unit tests

---

## 🚀 Running Tests

### Prerequisites

Make sure you have Hardhat installed in the contracts directory:

```bash
cd contracts
npm install
```

### Run All Tests

```bash
npm test
```

Or using Hardhat directly:

```bash
npx hardhat test ../tests/*.test.js
```

### Run Specific Test File

```bash
npx hardhat test ../tests/FHELending.test.js
npx hardhat test ../tests/FHEEncryption.test.js
npx hardhat test ../tests/SecurityTests.test.js
```

### Run Tests with Gas Report

```bash
npx hardhat test --gas-reporter
```

### Run Tests with Coverage

```bash
npx hardhat coverage --testfiles "../tests/*.test.js"
```

---

## 📊 Test Structure

### Test Organization

```
tests/
├── FHELending.test.js        # Core lending functionality
├── FHEEncryption.test.js     # FHE-specific features
├── SecurityTests.test.js     # Security validations
└── README.md                 # This file
```

### Test Pattern

All tests follow the AAA (Arrange-Act-Assert) pattern:

```javascript
it("Should do something", async function () {
  // Arrange: Setup test data
  const amount = ethers.parseEther("1");
  await lending.connect(user).depositCollateral({ value: amount });

  // Act: Perform action
  const collateral = await lending.getCollateral(user.address);

  // Assert: Verify result
  expect(collateral).to.equal(amount);
});
```

---

## 🎯 Key Test Scenarios

### Collateral Management
- Deposit ETH collateral
- Withdraw collateral (with/without debt)
- Multiple deposits from same user
- Multiple users with isolated balances

### Borrowing Flow
- Calculate max borrowable amount (50% of collateral)
- Request encrypted borrow
- Claim funds with plaintext validation
- Collateralization ratio enforcement (200%)

### Security
- Reentrancy protection on withdrawals
- Access control (users can't withdraw others' funds)
- Integer overflow/underflow protection
- Front-running protection via encryption
- Privacy guarantees (no amount leakage)

### FHE Encryption
- Encrypted amount storage
- Permission system validation
- Hybrid encryption + plaintext validation
- Event privacy (no plaintext amounts in logs)

---

## 🔍 Important Notes

### FHE Testing Limitations

⚠️ **Note:** These tests verify the contract interface and logic, but cannot fully test actual FHE encryption/decryption since:

1. **Gateway Requirement:** Real FHE operations require Zama's gateway service
2. **Local Testing:** Hardhat local network doesn't support FHE coprocessor
3. **Mock Testing:** Tests verify structure and logic, not actual encryption

### What IS Tested
- ✅ Function signatures and interfaces
- ✅ Business logic and validations
- ✅ Access control and permissions
- ✅ State management
- ✅ Event emissions
- ✅ Gas costs
- ✅ Security patterns

### What Requires Integration Testing
- ❌ Actual FHE encryption/decryption
- ❌ Real gateway interactions
- ❌ Full encrypted borrow flow
- ❌ Encrypted amount comparison operations

---

## 🛠 Test Configuration

### Hardhat Config for Tests

Add to `contracts/hardhat.config.js`:

```javascript
module.exports = {
  solidity: "0.8.28",
  networks: {
    hardhat: {
      chainId: 31337,
    },
  },
  paths: {
    tests: "../tests", // Point to root tests directory
  },
  mocha: {
    timeout: 60000, // 60 second timeout
  },
};
```

---

## 📈 Expected Test Output

### Successful Run

```
  FHELendingWithDecrypt
    Collateral Management
      ✓ Should allow users to deposit collateral (125ms)
      ✓ Should not allow deposit of 0 ETH (48ms)
      ✓ Should allow withdrawal when no debt (92ms)
      ...

  FHE Encryption Features
    Encrypted Borrow Request Structure
      ✓ Should accept requestBorrow with encrypted parameters (65ms)
      ✓ Should have claimBorrowedFunds function for validation (42ms)
      ...

  Security Tests
    Reentrancy Protection
      ✓ Should prevent reentrancy on withdrawal (104ms)
      ✓ Should prevent reentrancy on repayment (56ms)
      ...

  60 passing (8s)
```

### Test Metrics

- **Average Test Time:** 50-150ms per test
- **Total Run Time:** ~8-10 seconds for full suite
- **Coverage Target:** >80% line coverage
- **Security Tests:** 25+ attack vector validations

---

## 🐛 Debugging Tests

### Enable Verbose Logging

```javascript
// Add to test file
beforeEach(async function () {
  console.log("Setting up test...");
  // ... setup code
});
```

### Print Transaction Details

```javascript
const tx = await lending.depositCollateral({ value: amount });
const receipt = await tx.wait();
console.log("Gas used:", receipt.gasUsed.toString());
console.log("Transaction hash:", receipt.transactionHash);
```

### Check Contract State

```javascript
const balance = await ethers.provider.getBalance(await lending.getAddress());
console.log("Contract balance:", ethers.formatEther(balance));
```

---

## 🔄 Continuous Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: cd contracts && npm install
      - run: npm test
```

---

## 📝 Writing New Tests

### Template

```javascript
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Feature Name", function () {
  let lending;
  let user;

  beforeEach(async function () {
    [user] = await ethers.getSigners();

    const FHELending = await ethers.getContractFactory("FHELendingWithDecrypt");
    lending = await FHELending.deploy();
    await lending.waitForDeployment();
  });

  it("Should do something specific", async function () {
    // Arrange
    const amount = ethers.parseEther("1");

    // Act
    await lending.connect(user).someFunction(amount);

    // Assert
    const result = await lending.someGetter();
    expect(result).to.equal(expectedValue);
  });
});
```

---

## 🎓 Best Practices

1. **Isolated Tests:** Each test should be independent
2. **Clear Descriptions:** Use descriptive test names
3. **Setup/Teardown:** Use beforeEach for clean state
4. **Error Cases:** Test both success and failure paths
5. **Gas Efficiency:** Monitor gas costs in tests
6. **Security Focus:** Always test attack vectors
7. **Documentation:** Comment complex test logic

---

## 🔗 Resources

- [Hardhat Testing Guide](https://hardhat.org/tutorial/testing-contracts)
- [Chai Assertion Library](https://www.chaijs.com/api/bdd/)
- [Ethers.js Documentation](https://docs.ethers.org/)
- [Zama fhEVM Testing](https://docs.zama.ai/fhevm/guides/testing)

---

## 🤝 Contributing

When adding new features:
1. Write tests first (TDD approach)
2. Ensure all existing tests pass
3. Add security tests for new attack surfaces
4. Update this README with new test descriptions

---

<div align="center">
  <p><strong>Test Coverage is Security</strong></p>
  <p>Every line of code should be tested 🛡️</p>
</div>
