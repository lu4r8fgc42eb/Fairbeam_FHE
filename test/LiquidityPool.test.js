const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LiquidityPool", function () {
  let liquidityPool;
  let owner;
  let provider1;
  let provider2;
  let borrower;
  let authorizedContract;

  beforeEach(async function () {
    [owner, provider1, provider2, borrower, authorizedContract] = await ethers.getSigners();

    // Deploy LiquidityPool contract
    const LiquidityPool = await ethers.getContractFactory("LiquidityPool");
    liquidityPool = await LiquidityPool.deploy();
    await liquidityPool.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await liquidityPool.owner()).to.equal(owner.address);
    });

    it("Should start with zero liquidity", async function () {
      expect(await liquidityPool.getTotalLiquidity()).to.equal(0);
      expect(await liquidityPool.getTotalProvided()).to.equal(0);
    });
  });

  describe("Authorization", function () {
    it("Should allow owner to authorize contracts", async function () {
      await liquidityPool.setAuthorization(authorizedContract.address, true);
      expect(await liquidityPool.authorizedContracts(authorizedContract.address)).to.be.true;
    });

    it("Should allow owner to revoke authorization", async function () {
      await liquidityPool.setAuthorization(authorizedContract.address, true);
      await liquidityPool.setAuthorization(authorizedContract.address, false);
      expect(await liquidityPool.authorizedContracts(authorizedContract.address)).to.be.false;
    });

    it("Should reject non-owner authorization attempts", async function () {
      await expect(
        liquidityPool.connect(provider1).setAuthorization(authorizedContract.address, true)
      ).to.be.reverted;
    });
  });

  describe("Add Liquidity", function () {
    it("Should allow user to add liquidity", async function () {
      const amount = ethers.parseEther("5.0");

      await liquidityPool.connect(provider1).addLiquidity({ value: amount });

      expect(await liquidityPool.getTotalLiquidity()).to.equal(amount);
      expect(await liquidityPool.getUserLiquidity(provider1.address)).to.equal(amount);
    });

    it("Should emit LiquidityAdded event", async function () {
      const amount = ethers.parseEther("3.0");

      await expect(
        liquidityPool.connect(provider1).addLiquidity({ value: amount })
      ).to.emit(liquidityPool, "LiquidityAdded")
        .withArgs(provider1.address, amount);
    });

    it("Should accumulate multiple liquidity additions", async function () {
      const amount1 = ethers.parseEther("2.0");
      const amount2 = ethers.parseEther("3.0");

      await liquidityPool.connect(provider1).addLiquidity({ value: amount1 });
      await liquidityPool.connect(provider1).addLiquidity({ value: amount2 });

      expect(await liquidityPool.getUserLiquidity(provider1.address)).to.equal(amount1 + amount2);
      expect(await liquidityPool.getTotalProvided()).to.equal(amount1 + amount2);
    });

    it("Should revert on zero liquidity", async function () {
      await expect(
        liquidityPool.connect(provider1).addLiquidity({ value: 0 })
      ).to.be.revertedWith("Zero amount");
    });

    it("Should handle multiple providers", async function () {
      await liquidityPool.connect(provider1).addLiquidity({ value: ethers.parseEther("5.0") });
      await liquidityPool.connect(provider2).addLiquidity({ value: ethers.parseEther("10.0") });

      expect(await liquidityPool.getUserLiquidity(provider1.address)).to.equal(ethers.parseEther("5.0"));
      expect(await liquidityPool.getUserLiquidity(provider2.address)).to.equal(ethers.parseEther("10.0"));
      expect(await liquidityPool.getTotalLiquidity()).to.equal(ethers.parseEther("15.0"));
    });
  });

  describe("Remove Liquidity", function () {
    beforeEach(async function () {
      // Add liquidity first
      await liquidityPool.connect(provider1).addLiquidity({ value: ethers.parseEther("10.0") });
    });

    it("Should allow user to remove liquidity", async function () {
      const removeAmount = ethers.parseEther("4.0");
      const initialBalance = await ethers.provider.getBalance(provider1.address);

      const tx = await liquidityPool.connect(provider1).removeLiquidity(removeAmount);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;

      const finalBalance = await ethers.provider.getBalance(provider1.address);
      expect(finalBalance).to.be.closeTo(initialBalance + removeAmount - gasUsed, ethers.parseEther("0.001"));

      expect(await liquidityPool.getUserLiquidity(provider1.address)).to.equal(ethers.parseEther("6.0"));
    });

    it("Should emit LiquidityRemoved event", async function () {
      const removeAmount = ethers.parseEther("3.0");

      await expect(
        liquidityPool.connect(provider1).removeLiquidity(removeAmount)
      ).to.emit(liquidityPool, "LiquidityRemoved")
        .withArgs(provider1.address, removeAmount);
    });

    it("Should allow full withdrawal", async function () {
      await liquidityPool.connect(provider1).removeLiquidity(ethers.parseEther("10.0"));

      expect(await liquidityPool.getUserLiquidity(provider1.address)).to.equal(0);
      expect(await liquidityPool.getTotalLiquidity()).to.equal(0);
    });

    it("Should revert on zero removal", async function () {
      await expect(
        liquidityPool.connect(provider1).removeLiquidity(0)
      ).to.be.revertedWith("Zero amount");
    });

    it("Should revert when removing more than user balance", async function () {
      await expect(
        liquidityPool.connect(provider1).removeLiquidity(ethers.parseEther("15.0"))
      ).to.be.revertedWithCustomError(liquidityPool, "InsufficientBalance");
    });

    it("Should revert when pool has insufficient funds", async function () {
      // Authorize and disburse loan to drain pool
      await liquidityPool.setAuthorization(authorizedContract.address, true);
      await liquidityPool.connect(authorizedContract).disburseLoan(borrower.address, ethers.parseEther("8.0"));

      // Try to remove more than remaining pool balance
      await expect(
        liquidityPool.connect(provider1).removeLiquidity(ethers.parseEther("5.0"))
      ).to.be.revertedWithCustomError(liquidityPool, "InsufficientLiquidity");
    });
  });

  describe("Disburse Loan", function () {
    beforeEach(async function () {
      await liquidityPool.connect(provider1).addLiquidity({ value: ethers.parseEther("20.0") });
      await liquidityPool.setAuthorization(authorizedContract.address, true);
    });

    it("Should allow authorized contract to disburse loan", async function () {
      const loanAmount = ethers.parseEther("5.0");
      const initialBalance = await ethers.provider.getBalance(borrower.address);

      await liquidityPool.connect(authorizedContract).disburseLoan(borrower.address, loanAmount);

      const finalBalance = await ethers.provider.getBalance(borrower.address);
      expect(finalBalance).to.equal(initialBalance + loanAmount);
    });

    it("Should emit LoanDisbursed event", async function () {
      const loanAmount = ethers.parseEther("3.0");

      await expect(
        liquidityPool.connect(authorizedContract).disburseLoan(borrower.address, loanAmount)
      ).to.emit(liquidityPool, "LoanDisbursed")
        .withArgs(borrower.address, loanAmount);
    });

    it("Should reduce pool liquidity on disbursement", async function () {
      const initialLiquidity = await liquidityPool.getTotalLiquidity();
      const loanAmount = ethers.parseEther("5.0");

      await liquidityPool.connect(authorizedContract).disburseLoan(borrower.address, loanAmount);

      expect(await liquidityPool.getTotalLiquidity()).to.equal(initialLiquidity - loanAmount);
    });

    it("Should revert when unauthorized tries to disburse", async function () {
      await expect(
        liquidityPool.connect(provider2).disburseLoan(borrower.address, ethers.parseEther("1.0"))
      ).to.be.revertedWith("Unauthorized");
    });

    it("Should revert on invalid borrower address", async function () {
      await expect(
        liquidityPool.connect(authorizedContract).disburseLoan(ethers.ZeroAddress, ethers.parseEther("1.0"))
      ).to.be.revertedWith("Invalid borrower");
    });

    it("Should revert on zero amount", async function () {
      await expect(
        liquidityPool.connect(authorizedContract).disburseLoan(borrower.address, 0)
      ).to.be.revertedWith("Zero amount");
    });

    it("Should revert when pool has insufficient liquidity", async function () {
      await expect(
        liquidityPool.connect(authorizedContract).disburseLoan(borrower.address, ethers.parseEther("25.0"))
      ).to.be.revertedWithCustomError(liquidityPool, "InsufficientLiquidity");
    });
  });

  describe("Record Repayment", function () {
    beforeEach(async function () {
      await liquidityPool.setAuthorization(authorizedContract.address, true);
    });

    it("Should emit RepaymentReceived event", async function () {
      const repayAmount = ethers.parseEther("2.0");

      await expect(
        liquidityPool.connect(authorizedContract).recordRepayment(borrower.address, repayAmount)
      ).to.emit(liquidityPool, "RepaymentReceived")
        .withArgs(borrower.address, repayAmount);
    });

    it("Should revert when unauthorized tries to record repayment", async function () {
      await expect(
        liquidityPool.connect(provider1).recordRepayment(borrower.address, ethers.parseEther("1.0"))
      ).to.be.revertedWith("Unauthorized");
    });
  });

  describe("Liquidity Checks", function () {
    beforeEach(async function () {
      await liquidityPool.connect(provider1).addLiquidity({ value: ethers.parseEther("10.0") });
    });

    it("Should return true when pool has sufficient liquidity", async function () {
      expect(await liquidityPool.hasSufficientLiquidity(ethers.parseEther("5.0"))).to.be.true;
      expect(await liquidityPool.hasSufficientLiquidity(ethers.parseEther("10.0"))).to.be.true;
    });

    it("Should return false when pool has insufficient liquidity", async function () {
      expect(await liquidityPool.hasSufficientLiquidity(ethers.parseEther("15.0"))).to.be.false;
    });
  });

  describe("Utilization Rate", function () {
    beforeEach(async function () {
      await liquidityPool.connect(provider1).addLiquidity({ value: ethers.parseEther("100.0") });
      await liquidityPool.setAuthorization(authorizedContract.address, true);
    });

    it("Should return 0% utilization when no loans", async function () {
      expect(await liquidityPool.getUtilizationRate()).to.equal(0);
    });

    it("Should calculate correct utilization rate", async function () {
      // Disburse 25% of liquidity
      await liquidityPool.connect(authorizedContract).disburseLoan(borrower.address, ethers.parseEther("25.0"));

      // Utilization = (100 - 75) / 100 * 10000 = 2500 (25%)
      expect(await liquidityPool.getUtilizationRate()).to.equal(2500);
    });

    it("Should return 0% when no liquidity provided", async function () {
      // Deploy a fresh pool
      const LiquidityPool = await ethers.getContractFactory("LiquidityPool");
      const newPool = await LiquidityPool.deploy();
      await newPool.waitForDeployment();

      expect(await newPool.getUtilizationRate()).to.equal(0);
    });
  });

  describe("Receive ETH", function () {
    beforeEach(async function () {
      await liquidityPool.connect(provider1).addLiquidity({ value: ethers.parseEther("5.0") });
    });

    it("Should accept direct ETH transfers (repayments)", async function () {
      const repayAmount = ethers.parseEther("1.0");
      const initialLiquidity = await liquidityPool.getTotalLiquidity();

      // Send ETH directly to pool
      await borrower.sendTransaction({
        to: await liquidityPool.getAddress(),
        value: repayAmount
      });

      expect(await liquidityPool.getTotalLiquidity()).to.equal(initialLiquidity + repayAmount);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle very small liquidity amounts", async function () {
      const smallAmount = 1n; // 1 wei

      await liquidityPool.connect(provider1).addLiquidity({ value: smallAmount });
      expect(await liquidityPool.getUserLiquidity(provider1.address)).to.equal(smallAmount);
    });

    it("Should handle large liquidity amounts", async function () {
      // Use a large but reasonable amount that doesn't exceed test account balance
      const largeAmount = ethers.parseEther("1000");

      await liquidityPool.connect(provider1).addLiquidity({ value: largeAmount });
      expect(await liquidityPool.getUserLiquidity(provider1.address)).to.equal(largeAmount);
    });

    it("Should handle multiple loans from same pool", async function () {
      await liquidityPool.connect(provider1).addLiquidity({ value: ethers.parseEther("100.0") });
      await liquidityPool.setAuthorization(authorizedContract.address, true);

      await liquidityPool.connect(authorizedContract).disburseLoan(borrower.address, ethers.parseEther("10.0"));
      await liquidityPool.connect(authorizedContract).disburseLoan(borrower.address, ethers.parseEther("15.0"));
      await liquidityPool.connect(authorizedContract).disburseLoan(borrower.address, ethers.parseEther("5.0"));

      expect(await liquidityPool.getTotalLiquidity()).to.equal(ethers.parseEther("70.0"));
    });
  });

  describe("Multi-Provider Scenarios", function () {
    it("Should track individual provider contributions independently", async function () {
      await liquidityPool.connect(provider1).addLiquidity({ value: ethers.parseEther("30.0") });
      await liquidityPool.connect(provider2).addLiquidity({ value: ethers.parseEther("70.0") });

      expect(await liquidityPool.getUserLiquidity(provider1.address)).to.equal(ethers.parseEther("30.0"));
      expect(await liquidityPool.getUserLiquidity(provider2.address)).to.equal(ethers.parseEther("70.0"));
      expect(await liquidityPool.getTotalProvided()).to.equal(ethers.parseEther("100.0"));
    });

    it("Should allow partial withdrawal without affecting other providers", async function () {
      await liquidityPool.connect(provider1).addLiquidity({ value: ethers.parseEther("50.0") });
      await liquidityPool.connect(provider2).addLiquidity({ value: ethers.parseEther("50.0") });

      await liquidityPool.connect(provider1).removeLiquidity(ethers.parseEther("25.0"));

      expect(await liquidityPool.getUserLiquidity(provider1.address)).to.equal(ethers.parseEther("25.0"));
      expect(await liquidityPool.getUserLiquidity(provider2.address)).to.equal(ethers.parseEther("50.0"));
    });
  });
});
