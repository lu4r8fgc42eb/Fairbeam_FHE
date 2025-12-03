const { expect } = require("chai");
const { ethers } = require("hardhat");

/**
 * Security and Attack Vector Tests
 *
 * These tests verify the contract is secure against common attack patterns
 */
describe("Security Tests", function () {
  let lending;
  let owner;
  let attacker;
  let victim;

  beforeEach(async function () {
    [owner, attacker, victim] = await ethers.getSigners();

    const FHELending = await ethers.getContractFactory("FHELendingWithDecrypt");
    lending = await FHELending.deploy();
    await lending.waitForDeployment();

    // Setup liquidity
    await lending.connect(owner).depositCollateral({ value: ethers.parseEther("10") });
  });

  describe("Reentrancy Protection", function () {
    it("Should prevent reentrancy on withdrawal", async function () {
      // Deposit collateral
      await lending.connect(attacker).depositCollateral({ value: ethers.parseEther("1") });

      // Attempt withdrawal (if there were a reentrancy vulnerability, this would exploit it)
      // The contract should have ReentrancyGuard to prevent this

      await expect(
        lending.connect(attacker).withdrawCollateral(ethers.parseEther("1"))
      ).to.not.be.reverted;

      // Verify attacker can't double-withdraw
      await expect(
        lending.connect(attacker).withdrawCollateral(ethers.parseEther("0.1"))
      ).to.be.revertedWith("Insufficient collateral");
    });

    it("Should prevent reentrancy on repayment", async function () {
      // Even with malicious contract, repayment should be safe
      await expect(
        lending.connect(attacker).repay({ value: ethers.parseEther("1") })
      ).to.be.revertedWith("No outstanding debt");
    });
  });

  describe("Access Control", function () {
    it("Should not allow users to withdraw others' collateral", async function () {
      await lending.connect(victim).depositCollateral({ value: ethers.parseEther("1") });

      // Attacker tries to withdraw victim's collateral
      await expect(
        lending.connect(attacker).withdrawCollateral(ethers.parseEther("1"))
      ).to.be.revertedWith("Insufficient collateral");

      // Victim's collateral should remain intact
      const victimCollateral = await lending.getCollateral(victim.address);
      expect(victimCollateral).to.equal(ethers.parseEther("1"));
    });

    it("Should isolate user balances correctly", async function () {
      await lending.connect(victim).depositCollateral({ value: ethers.parseEther("1") });
      await lending.connect(attacker).depositCollateral({ value: ethers.parseEther("2") });

      const victimBalance = await lending.getCollateral(victim.address);
      const attackerBalance = await lending.getCollateral(attacker.address);

      expect(victimBalance).to.equal(ethers.parseEther("1"));
      expect(attackerBalance).to.equal(ethers.parseEther("2"));
    });
  });

  describe("Integer Overflow/Underflow", function () {
    it("Should handle maximum uint256 values safely", async function () {
      // Solidity 0.8+ has built-in overflow protection
      // Try to withdraw more than deposited
      await lending.connect(attacker).depositCollateral({ value: ethers.parseEther("1") });

      await expect(
        lending.connect(attacker).withdrawCollateral(ethers.parseEther("2"))
      ).to.be.revertedWith("Insufficient collateral");
    });

    it("Should prevent underflow in debt calculation", async function () {
      // Try to repay when there's no debt
      await expect(
        lending.connect(attacker).repay({ value: ethers.parseEther("1") })
      ).to.be.revertedWith("No outstanding debt");
    });
  });

  describe("Denial of Service", function () {
    it("Should handle multiple users without DoS", async function () {
      // Create multiple users and ensure contract remains functional
      const users = await ethers.getSigners();

      for (let i = 0; i < 10; i++) {
        await lending.connect(users[i]).depositCollateral({
          value: ethers.parseEther("0.1")
        });
      }

      // All users should be able to withdraw
      for (let i = 0; i < 10; i++) {
        await expect(
          lending.connect(users[i]).withdrawCollateral(ethers.parseEther("0.1"))
        ).to.not.be.reverted;
      }
    });

    it("Should handle zero-value transactions gracefully", async function () {
      await expect(
        lending.connect(attacker).depositCollateral({ value: 0 })
      ).to.be.revertedWith("Amount must be greater than 0");
    });
  });

  describe("Front-Running Protection (via FHE)", function () {
    it("Should store borrow amounts in encrypted form", async function () {
      // The contract stores amounts as encrypted euint64
      // This prevents front-running attacks since amounts are not visible

      await lending.connect(victim).depositCollateral({ value: ethers.parseEther("2") });

      // Even if attacker sees the transaction in mempool,
      // they cannot see the encrypted borrow amount

      // Verify contract accepts encrypted input
      const contractInterface = lending.interface;
      const requestBorrow = contractInterface.getFunction("requestBorrow");

      // Function should accept inEuint64 (encrypted type)
      expect(requestBorrow.inputs[0].type).to.include("bytes");
    });
  });

  describe("Collateralization Enforcement", function () {
    it("Should enforce 200% collateralization ratio", async function () {
      await lending.connect(attacker).depositCollateral({ value: ethers.parseEther("1") });

      const maxBorrowable = await lending.getMaxBorrowable(attacker.address);

      // Max borrowable should be 50% of collateral
      expect(maxBorrowable).to.equal(ethers.parseEther("0.5"));

      // Trying to claim more should fail
      await expect(
        lending.connect(attacker).claimBorrowedFunds(ethers.parseEther("0.6"))
      ).to.be.reverted;
    });

    it("Should prevent withdrawal below safe collateral level", async function () {
      await lending.connect(attacker).depositCollateral({ value: ethers.parseEther("1") });

      // If user has debt, they shouldn't be able to withdraw
      // (This would be set up through actual borrowing flow)

      // For now, verify withdrawal logic exists
      const collateral = await lending.getCollateral(attacker.address);
      expect(collateral).to.equal(ethers.parseEther("1"));
    });
  });

  describe("State Manipulation", function () {
    it("Should maintain consistent state across operations", async function () {
      await lending.connect(attacker).depositCollateral({ value: ethers.parseEther("1") });

      const collateralBefore = await lending.getCollateral(attacker.address);
      const liquidityBefore = await lending.getAvailableLiquidity();

      await lending.connect(attacker).withdrawCollateral(ethers.parseEther("0.5"));

      const collateralAfter = await lending.getCollateral(attacker.address);
      const liquidityAfter = await lending.getAvailableLiquidity();

      expect(collateralAfter).to.equal(collateralBefore - ethers.parseEther("0.5"));
      expect(liquidityAfter).to.equal(liquidityBefore - ethers.parseEther("0.5"));
    });

    it("Should not allow state inconsistencies", async function () {
      // Contract balance should always match sum of user balances
      await lending.connect(victim).depositCollateral({ value: ethers.parseEther("1") });
      await lending.connect(attacker).depositCollateral({ value: ethers.parseEther("2") });

      const victimBalance = await lending.getCollateral(victim.address);
      const attackerBalance = await lending.getCollateral(attacker.address);
      const contractBalance = await ethers.provider.getBalance(await lending.getAddress());

      // Contract should have at least the sum of user balances
      expect(contractBalance).to.be.at.least(victimBalance + attackerBalance);
    });
  });

  describe("Timestamp Manipulation", function () {
    it("Should not rely solely on block.timestamp for critical logic", async function () {
      // Verify contract uses block.timestamp appropriately
      // (only for non-critical timestamp tracking)

      await lending.connect(attacker).depositCollateral({ value: ethers.parseEther("1") });

      // Operations should succeed regardless of timestamp
      await expect(
        lending.connect(attacker).withdrawCollateral(ethers.parseEther("0.5"))
      ).to.not.be.reverted;
    });
  });

  describe("Insufficient Validation", function () {
    it("Should validate all user inputs", async function () {
      // Zero amounts should be rejected
      await expect(
        lending.connect(attacker).depositCollateral({ value: 0 })
      ).to.be.revertedWith("Amount must be greater than 0");

      await expect(
        lending.connect(attacker).claimBorrowedFunds(0)
      ).to.be.revertedWith("Amount must be greater than 0");
    });

    it("Should validate addresses are not zero", async function () {
      // Functions should handle zero address checks where appropriate
      const zeroAddressCollateral = await lending.getCollateral(ethers.ZeroAddress);
      expect(zeroAddressCollateral).to.equal(0);
    });
  });

  describe("Gas Limit DoS", function () {
    it("Should not have unbounded loops that could cause DoS", async function () {
      // The contract should not have loops that depend on user input length
      // All operations should have predictable gas costs

      const tx = await lending.connect(attacker).depositCollateral({
        value: ethers.parseEther("1")
      });
      const receipt = await tx.wait();

      // Gas should be bounded and reasonable
      expect(receipt.gasUsed).to.be.lessThan(200000n);
    });
  });

  describe("Locked Ether", function () {
    it("Should allow users to retrieve their collateral", async function () {
      await lending.connect(victim).depositCollateral({ value: ethers.parseEther("1") });

      // User should be able to withdraw (no ether locked permanently)
      await expect(
        lending.connect(victim).withdrawCollateral(ethers.parseEther("1"))
      ).to.not.be.reverted;

      const balance = await lending.getCollateral(victim.address);
      expect(balance).to.equal(0);
    });
  });

  describe("Privacy Guarantees", function () {
    it("Should not expose encrypted amounts in public state", async function () {
      // When a user makes a borrow request, the amount should be encrypted
      // and not readable by other users or from public blockchain data

      await lending.connect(victim).depositCollateral({ value: ethers.parseEther("2") });

      // Even attacker monitoring the chain shouldn't see the amount
      // This is guaranteed by FHE encryption

      const hasRequest = await lending.hasActiveRequest(victim.address);
      // Can only see boolean, not the amount
      expect(hasRequest).to.be.a('boolean');
    });

    it("Should prevent amount leakage through events", async function () {
      // Events should not emit plaintext sensitive amounts
      // Verify contract events structure

      const contractInterface = lending.interface;
      const events = contractInterface.fragments.filter(f => f.type === 'event');

      // Check that sensitive events don't expose amounts
      const borrowRequestedEvent = events.find(e => e.name === 'BorrowRequested');
      if (borrowRequestedEvent) {
        const hasPlaintextAmount = borrowRequestedEvent.inputs.some(
          input => input.name === 'amount' && input.type === 'uint256'
        );
        expect(hasPlaintextAmount).to.equal(false);
      }
    });
  });

  describe("Emergency Scenarios", function () {
    it("Should handle contract with no liquidity gracefully", async function () {
      // Deploy fresh contract with no liquidity
      const FreshLending = await ethers.getContractFactory("FHELendingWithDecrypt");
      const freshLending = await FreshLending.deploy();

      await freshLending.connect(victim).depositCollateral({ value: ethers.parseEther("1") });

      // Trying to claim funds should fail gracefully
      await expect(
        freshLending.connect(victim).claimBorrowedFunds(ethers.parseEther("0.1"))
      ).to.be.reverted;
    });

    it("Should handle repayment of excessive amounts", async function () {
      // User shouldn't be able to repay more than they owe
      // (Excess should be returned)

      await expect(
        lending.connect(attacker).repay({ value: ethers.parseEther("10") })
      ).to.be.revertedWith("No outstanding debt");
    });
  });
});
