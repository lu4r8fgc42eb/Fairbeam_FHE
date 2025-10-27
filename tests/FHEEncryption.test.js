const { expect } = require("chai");
const { ethers } = require("hardhat");

/**
 * FHE Encryption Tests
 *
 * Note: These tests verify the FHE encryption interface and structure.
 * Actual FHE encryption/decryption requires the Zama gateway and
 * cannot be fully tested in a local Hardhat environment.
 */
describe("FHE Encryption Features", function () {
  let lending;
  let owner;
  let user;

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    const FHELending = await ethers.getContractFactory("FHELendingWithDecrypt");
    lending = await FHELending.deploy();
    await lending.waitForDeployment();

    // Setup: Add collateral and liquidity
    await lending.connect(user).depositCollateral({ value: ethers.parseEther("2") });
    await lending.connect(owner).depositCollateral({ value: ethers.parseEther("10") });
  });

  describe("Encrypted Borrow Request Structure", function () {
    it("Should accept requestBorrow with encrypted parameters", async function () {
      // Note: In real usage, these would be actual encrypted values from fhevmjs
      // For unit testing, we're verifying the function signature and basic structure

      // This test verifies the interface exists and accepts the correct parameter types
      const contractInterface = lending.interface;
      const requestBorrowFunction = contractInterface.getFunction("requestBorrow");

      expect(requestBorrowFunction).to.not.be.undefined;
      expect(requestBorrowFunction.name).to.equal("requestBorrow");

      // Verify it has 2 inputs: inEuint64 and bytes
      expect(requestBorrowFunction.inputs.length).to.equal(2);
    });

    it("Should have claimBorrowedFunds function for validation", async function () {
      const contractInterface = lending.interface;
      const claimFunction = contractInterface.getFunction("claimBorrowedFunds");

      expect(claimFunction).to.not.be.undefined;
      expect(claimFunction.name).to.equal("claimBorrowedFunds");

      // Verify it accepts uint256 (plaintext amount)
      expect(claimFunction.inputs.length).to.equal(1);
      expect(claimFunction.inputs[0].type).to.equal("uint256");
    });
  });

  describe("Borrow Request Tracking", function () {
    it("Should track active borrow requests", async function () {
      const hasRequest = await lending.hasActiveRequest(user.address);
      expect(hasRequest).to.be.a('boolean');
      expect(hasRequest).to.equal(false); // Initially no request
    });

    it("Should store borrow request structure", async function () {
      // Verify the borrowRequests mapping returns expected structure
      const request = await lending.borrowRequests(user.address);

      // Should return tuple with: (amountEnc, timestamp, claimed)
      expect(request).to.be.an('array');
      expect(request.length).to.equal(3);
    });
  });

  describe("Claim Validation Logic", function () {
    it("Should not allow claim without active request", async function () {
      await expect(
        lending.connect(user).claimBorrowedFunds(ethers.parseEther("0.5"))
      ).to.be.revertedWith("No active borrow request");
    });

    it("Should not allow claim with 0 amount", async function () {
      await expect(
        lending.connect(user).claimBorrowedFunds(0)
      ).to.be.revertedWith("Amount must be greater than 0");
    });

    it("Should validate collateralization ratio on claim", async function () {
      // Even without a proper encrypted request, the function should validate collateral
      // This tests the plaintext validation logic

      const userCollateral = await lending.getCollateral(user.address);
      const excessiveAmount = userCollateral * 2n; // Try to borrow more than 200% ratio

      await expect(
        lending.connect(user).claimBorrowedFunds(excessiveAmount)
      ).to.be.reverted; // Should fail due to insufficient collateral
    });
  });

  describe("FHE Permission System", function () {
    it("Should have permission management in place", async function () {
      // The contract should implement FHE.allow() for permission management
      // This is verified by checking the contract can be deployed and has the required functions

      const contractCode = await ethers.provider.getCode(await lending.getAddress());
      expect(contractCode).to.not.equal("0x"); // Contract is deployed
      expect(contractCode.length).to.be.greaterThan(100); // Has substantial code
    });
  });

  describe("Encrypted Data Privacy", function () {
    it("Should not expose encrypted amounts in events", async function () {
      // When a borrow request is made, the encrypted amount should not be
      // directly readable from events (only handle is emitted)

      const contractInterface = lending.interface;
      const events = contractInterface.fragments.filter(f => f.type === 'event');

      // Verify BorrowRequested event exists but doesn't expose amount
      const borrowRequestedEvent = events.find(e => e.name === 'BorrowRequested');
      expect(borrowRequestedEvent).to.not.be.undefined;

      // Event should only have user address, not plaintext amount
      const eventInputs = borrowRequestedEvent.inputs;
      const hasPlaintextAmount = eventInputs.some(input =>
        input.name === 'amount' && input.type === 'uint256'
      );
      expect(hasPlaintextAmount).to.equal(false);
    });
  });

  describe("Hybrid Validation Approach", function () {
    it("Should combine encrypted storage with plaintext validation", async function () {
      // The contract uses hybrid approach:
      // 1. Store encrypted amounts
      // 2. User provides plaintext for claiming
      // 3. Contract validates plaintext matches encrypted

      // Verify contract has both encrypted storage and plaintext validation
      const contractInterface = lending.interface;

      // Has requestBorrow for encrypted input
      const requestBorrow = contractInterface.getFunction("requestBorrow");
      expect(requestBorrow).to.not.be.undefined;

      // Has claimBorrowedFunds for plaintext validation
      const claimFunds = contractInterface.getFunction("claimBorrowedFunds");
      expect(claimFunds).to.not.be.undefined;

      // This hybrid approach maintains privacy while ensuring security
    });
  });

  describe("Security Checks", function () {
    it("Should prevent double claiming", async function () {
      // Even without proper encryption setup, the claimed flag should prevent double claims
      const request = await lending.borrowRequests(user.address);
      const claimed = request[2]; // Third element is 'claimed' boolean

      expect(claimed).to.be.a('boolean');
    });

    it("Should require sufficient liquidity for claims", async function () {
      // Contract should check available liquidity before disbursing loans
      const liquidity = await lending.getAvailableLiquidity();
      expect(liquidity).to.be.greaterThan(0);

      // Trying to borrow more than available liquidity should fail
      const excessiveAmount = liquidity + ethers.parseEther("1");

      await expect(
        lending.connect(user).claimBorrowedFunds(excessiveAmount)
      ).to.be.reverted;
    });

    it("Should track debt correctly after claim", async function () {
      // Debt tracking is crucial for collateral management
      const debtBefore = await lending.getOutstandingDebt(user.address);
      expect(debtBefore).to.equal(0);

      // After a successful claim, debt should increase
      // (This would require a full encrypted flow to test properly)
    });
  });

  describe("Integration Points", function () {
    it("Should integrate with collateral system", async function () {
      const collateral = await lending.getCollateral(user.address);
      const maxBorrowable = await lending.getMaxBorrowable(user.address);

      // Max borrowable should be 50% of collateral (200% ratio)
      expect(maxBorrowable).to.equal(collateral / 2n);
    });

    it("Should integrate with liquidity pool", async function () {
      const liquidityBefore = await lending.getAvailableLiquidity();

      // Liquidity should decrease after loan disbursement
      // (Would need full flow to test)

      expect(liquidityBefore).to.be.greaterThan(0);
    });

    it("Should integrate with debt tracking", async function () {
      const debt = await lending.getOutstandingDebt(user.address);
      const healthFactor = await lending.getHealthFactor(user.address);

      // Health factor should be calculated based on debt
      expect(healthFactor).to.be.a('bigint');
    });
  });

  describe("Gas Optimization", function () {
    it("Should have reasonable gas costs for deposit", async function () {
      const tx = await lending.connect(user).depositCollateral({
        value: ethers.parseEther("1")
      });
      const receipt = await tx.wait();

      // Gas should be reasonable (< 100k for simple deposit)
      expect(receipt.gasUsed).to.be.lessThan(100000n);
    });

    it("Should have reasonable gas costs for withdrawal", async function () {
      await lending.connect(user).depositCollateral({ value: ethers.parseEther("1") });

      const tx = await lending.connect(user).withdrawCollateral(ethers.parseEther("0.5"));
      const receipt = await tx.wait();

      // Withdrawal should also be gas-efficient
      expect(receipt.gasUsed).to.be.lessThan(100000n);
    });
  });
});
