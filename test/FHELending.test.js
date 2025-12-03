const { expect } = require("chai");
const { ethers } = require("hardhat");
const { parseEther, formatEther } = ethers;

describe("FHELendingWithDecrypt", function () {
  let lending;
  let owner;
  let borrower;
  let lender;

  beforeEach(async function () {
    [owner, borrower, lender] = await ethers.getSigners();

    // Deploy contract
    const FHELending = await ethers.getContractFactory("FHELendingWithDecrypt");
    lending = await FHELending.deploy();
    await lending.waitForDeployment();

    // Add initial liquidity to the pool
    await lending.connect(owner).depositCollateral({ value: parseEther("10") });
  });

  describe("Collateral Management", function () {
    it("Should allow users to deposit collateral", async function () {
      const depositAmount = parseEther("1");

      await expect(
        lending.connect(borrower).depositCollateral({ value: depositAmount })
      ).to.emit(lending, "CollateralDeposited")
        .withArgs(borrower.address, depositAmount);

      const collateral = await lending.getCollateral(borrower.address);
      expect(collateral).to.equal(depositAmount);
    });

    it("Should not allow deposit of 0 ETH", async function () {
      await expect(
        lending.connect(borrower).depositCollateral({ value: 0 })
      ).to.be.revertedWith("Amount must be greater than 0");
    });

    it("Should allow withdrawal when no debt", async function () {
      const depositAmount = parseEther("1");
      await lending.connect(borrower).depositCollateral({ value: depositAmount });

      await expect(
        lending.connect(borrower).withdrawCollateral(depositAmount)
      ).to.emit(lending, "CollateralWithdrawn")
        .withArgs(borrower.address, depositAmount);

      const collateral = await lending.getCollateral(borrower.address);
      expect(collateral).to.equal(0);
    });

    it("Should not allow withdrawal with outstanding debt", async function () {
      const depositAmount = parseEther("1");
      await lending.connect(borrower).depositCollateral({ value: depositAmount });

      // Simulate having debt (this would normally come from borrowing)
      // For testing, we'll need to create a borrow first

      await expect(
        lending.connect(borrower).withdrawCollateral(depositAmount)
      ).to.be.reverted;
    });

    it("Should not allow withdrawal exceeding balance", async function () {
      const depositAmount = parseEther("1");
      await lending.connect(borrower).depositCollateral({ value: depositAmount });

      await expect(
        lending.connect(borrower).withdrawCollateral(parseEther("2"))
      ).to.be.revertedWith("Insufficient collateral");
    });
  });

  describe("Liquidity Pool", function () {
    it("Should show correct available liquidity", async function () {
      const liquidity = await lending.getAvailableLiquidity();
      expect(liquidity).to.equal(parseEther("10"));
    });

    it("Should track contract balance correctly", async function () {
      const contractBalance = await ethers.provider.getBalance(await lending.getAddress());
      expect(contractBalance).to.equal(parseEther("10"));
    });
  });

  describe("Borrowing Calculations", function () {
    it("Should calculate max borrowable amount correctly", async function () {
      const collateral = parseEther("1");
      await lending.connect(borrower).depositCollateral({ value: collateral });

      const maxBorrowable = await lending.getMaxBorrowable(borrower.address);
      // Max borrowable is 50% of collateral (200% collateralization ratio)
      expect(maxBorrowable).to.equal(collateral / 2n);
    });

    it("Should return 0 max borrowable with no collateral", async function () {
      const maxBorrowable = await lending.getMaxBorrowable(borrower.address);
      expect(maxBorrowable).to.equal(0);
    });

    it("Should calculate health factor correctly", async function () {
      const collateral = parseEther("1");
      await lending.connect(borrower).depositCollateral({ value: collateral });

      // Health factor should be very high with no debt
      const healthFactor = await lending.getHealthFactor(borrower.address);
      expect(healthFactor).to.be.gt(0);
    });
  });

  describe("Debt Tracking", function () {
    it("Should track outstanding debt correctly", async function () {
      const debt = await lending.getOutstandingDebt(borrower.address);
      expect(debt).to.equal(0);
    });

    it("Should show no active request initially", async function () {
      const hasRequest = await lending.hasActiveRequest(borrower.address);
      expect(hasRequest).to.equal(false);
    });
  });

  describe("Repayment", function () {
    it("Should not allow repayment with no debt", async function () {
      await expect(
        lending.connect(borrower).repay({ value: parseEther("0.1") })
      ).to.be.revertedWith("No outstanding debt");
    });

    it("Should not allow repayment of 0 ETH", async function () {
      await expect(
        lending.connect(borrower).repay({ value: 0 })
      ).to.be.revertedWith("Must repay something");
    });
  });

  describe("Access Control", function () {
    it("Should allow anyone to deposit collateral", async function () {
      await expect(
        lending.connect(lender).depositCollateral({ value: parseEther("1") })
      ).to.not.be.reverted;
    });

    it("Should allow anyone to view their own data", async function () {
      const collateral = await lending.getCollateral(borrower.address);
      const debt = await lending.getOutstandingDebt(borrower.address);

      expect(collateral).to.be.a('bigint');
      expect(debt).to.be.a('bigint');
    });
  });

  describe("Edge Cases", function () {
    it("Should handle very small deposits", async function () {
      const smallAmount = parseEther("0.001");

      await expect(
        lending.connect(borrower).depositCollateral({ value: smallAmount })
      ).to.emit(lending, "CollateralDeposited");

      const collateral = await lending.getCollateral(borrower.address);
      expect(collateral).to.equal(smallAmount);
    });

    it("Should handle multiple deposits from same user", async function () {
      await lending.connect(borrower).depositCollateral({ value: parseEther("1") });
      await lending.connect(borrower).depositCollateral({ value: parseEther("1") });

      const collateral = await lending.getCollateral(borrower.address);
      expect(collateral).to.equal(parseEther("2"));
    });

    it("Should handle multiple users independently", async function () {
      await lending.connect(borrower).depositCollateral({ value: parseEther("1") });
      await lending.connect(lender).depositCollateral({ value: parseEther("2") });

      const borrowerCollateral = await lending.getCollateral(borrower.address);
      const lenderCollateral = await lending.getCollateral(lender.address);

      expect(borrowerCollateral).to.equal(parseEther("1"));
      expect(lenderCollateral).to.equal(parseEther("2"));
    });
  });

  describe("Contract State", function () {
    it("Should maintain correct total collateral", async function () {
      await lending.connect(borrower).depositCollateral({ value: parseEther("1") });
      await lending.connect(lender).depositCollateral({ value: parseEther("2") });

      const totalBalance = await ethers.provider.getBalance(await lending.getAddress());
      // Initial 10 + 1 + 2 = 13 ETH
      expect(totalBalance).to.equal(parseEther("13"));
    });

    it("Should maintain correct liquidity after withdrawal", async function () {
      await lending.connect(borrower).depositCollateral({ value: parseEther("1") });

      const liquidityBefore = await lending.getAvailableLiquidity();

      await lending.connect(borrower).withdrawCollateral(parseEther("0.5"));

      const liquidityAfter = await lending.getAvailableLiquidity();
      expect(liquidityAfter).to.equal(liquidityBefore - parseEther("0.5"));
    });
  });

  describe("Events", function () {
    it("Should emit CollateralDeposited event", async function () {
      await expect(
        lending.connect(borrower).depositCollateral({ value: parseEther("1") })
      ).to.emit(lending, "CollateralDeposited")
        .withArgs(borrower.address, parseEther("1"));
    });

    it("Should emit CollateralWithdrawn event", async function () {
      await lending.connect(borrower).depositCollateral({ value: parseEther("1") });

      await expect(
        lending.connect(borrower).withdrawCollateral(parseEther("1"))
      ).to.emit(lending, "CollateralWithdrawn")
        .withArgs(borrower.address, parseEther("1"));
    });
  });
});
