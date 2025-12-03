const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CollateralManager", function () {
  let collateralManager;
  let owner;
  let user1;
  let user2;
  let authorizedContract;

  beforeEach(async function () {
    [owner, user1, user2, authorizedContract] = await ethers.getSigners();

    // Deploy CollateralManager contract
    const CollateralManager = await ethers.getContractFactory("CollateralManager");
    collateralManager = await CollateralManager.deploy();
    await collateralManager.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await collateralManager.owner()).to.equal(owner.address);
    });

    it("Should start with zero collateral for all users", async function () {
      expect(await collateralManager.getCollateral(user1.address)).to.equal(0);
      expect(await collateralManager.getCollateral(user2.address)).to.equal(0);
    });
  });

  describe("Authorization", function () {
    it("Should allow owner to authorize contracts", async function () {
      await collateralManager.setAuthorization(authorizedContract.address, true);
      expect(await collateralManager.authorizedContracts(authorizedContract.address)).to.be.true;
    });

    it("Should allow owner to revoke authorization", async function () {
      await collateralManager.setAuthorization(authorizedContract.address, true);
      await collateralManager.setAuthorization(authorizedContract.address, false);
      expect(await collateralManager.authorizedContracts(authorizedContract.address)).to.be.false;
    });

    it("Should reject non-owner authorization attempts", async function () {
      await expect(
        collateralManager.connect(user1).setAuthorization(authorizedContract.address, true)
      ).to.be.reverted;
    });
  });

  describe("Direct Collateral Deposit", function () {
    it("Should allow user to deposit collateral", async function () {
      const depositAmount = ethers.parseEther("1.0");

      await collateralManager.connect(user1).depositCollateral({ value: depositAmount });

      expect(await collateralManager.getCollateral(user1.address)).to.equal(depositAmount);
    });

    it("Should emit CollateralDeposited event", async function () {
      const depositAmount = ethers.parseEther("1.0");

      await expect(
        collateralManager.connect(user1).depositCollateral({ value: depositAmount })
      ).to.emit(collateralManager, "CollateralDeposited")
        .withArgs(user1.address, depositAmount);
    });

    it("Should accumulate multiple deposits", async function () {
      const deposit1 = ethers.parseEther("1.0");
      const deposit2 = ethers.parseEther("0.5");

      await collateralManager.connect(user1).depositCollateral({ value: deposit1 });
      await collateralManager.connect(user1).depositCollateral({ value: deposit2 });

      expect(await collateralManager.getCollateral(user1.address)).to.equal(deposit1 + deposit2);
    });

    it("Should revert on zero deposit", async function () {
      await expect(
        collateralManager.connect(user1).depositCollateral({ value: 0 })
      ).to.be.revertedWithCustomError(collateralManager, "ZeroAmount");
    });
  });

  describe("Deposit For (Authorized)", function () {
    beforeEach(async function () {
      await collateralManager.setAuthorization(authorizedContract.address, true);
    });

    it("Should allow authorized contract to deposit for user", async function () {
      const depositAmount = ethers.parseEther("2.0");

      await collateralManager.connect(authorizedContract).depositFor(user1.address, { value: depositAmount });

      expect(await collateralManager.getCollateral(user1.address)).to.equal(depositAmount);
    });

    it("Should emit CollateralDeposited for depositFor", async function () {
      const depositAmount = ethers.parseEther("1.5");

      await expect(
        collateralManager.connect(authorizedContract).depositFor(user1.address, { value: depositAmount })
      ).to.emit(collateralManager, "CollateralDeposited")
        .withArgs(user1.address, depositAmount);
    });

    it("Should revert when unauthorized tries depositFor", async function () {
      await expect(
        collateralManager.connect(user2).depositFor(user1.address, { value: ethers.parseEther("1.0") })
      ).to.be.revertedWith("Unauthorized");
    });

    it("Should revert on zero amount depositFor", async function () {
      await expect(
        collateralManager.connect(authorizedContract).depositFor(user1.address, { value: 0 })
      ).to.be.revertedWithCustomError(collateralManager, "ZeroAmount");
    });

    it("Should revert on invalid depositor address", async function () {
      await expect(
        collateralManager.connect(authorizedContract).depositFor(ethers.ZeroAddress, { value: ethers.parseEther("1.0") })
      ).to.be.revertedWith("Invalid depositor");
    });
  });

  describe("Direct Collateral Withdrawal", function () {
    beforeEach(async function () {
      // Deposit some collateral first
      await collateralManager.connect(user1).depositCollateral({ value: ethers.parseEther("2.0") });
    });

    it("Should allow user to withdraw collateral", async function () {
      const withdrawAmount = ethers.parseEther("0.5");
      const initialBalance = await ethers.provider.getBalance(user1.address);

      const tx = await collateralManager.connect(user1).withdrawCollateral(withdrawAmount);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;

      const finalBalance = await ethers.provider.getBalance(user1.address);
      expect(finalBalance).to.be.closeTo(initialBalance + withdrawAmount - gasUsed, ethers.parseEther("0.001"));

      expect(await collateralManager.getCollateral(user1.address)).to.equal(ethers.parseEther("1.5"));
    });

    it("Should emit CollateralWithdrawn event", async function () {
      const withdrawAmount = ethers.parseEther("0.5");

      await expect(
        collateralManager.connect(user1).withdrawCollateral(withdrawAmount)
      ).to.emit(collateralManager, "CollateralWithdrawn")
        .withArgs(user1.address, withdrawAmount);
    });

    it("Should allow full withdrawal", async function () {
      const fullAmount = ethers.parseEther("2.0");

      await collateralManager.connect(user1).withdrawCollateral(fullAmount);

      expect(await collateralManager.getCollateral(user1.address)).to.equal(0);
    });

    it("Should revert on zero withdrawal", async function () {
      await expect(
        collateralManager.connect(user1).withdrawCollateral(0)
      ).to.be.revertedWithCustomError(collateralManager, "ZeroAmount");
    });

    it("Should revert when withdrawing more than balance", async function () {
      await expect(
        collateralManager.connect(user1).withdrawCollateral(ethers.parseEther("3.0"))
      ).to.be.revertedWithCustomError(collateralManager, "InsufficientCollateral");
    });
  });

  describe("Withdraw For (Authorized)", function () {
    beforeEach(async function () {
      await collateralManager.setAuthorization(authorizedContract.address, true);
      // Deposit via authorized contract
      await collateralManager.connect(authorizedContract).depositFor(user1.address, { value: ethers.parseEther("3.0") });
    });

    it("Should allow authorized contract to withdraw for user", async function () {
      const withdrawAmount = ethers.parseEther("1.0");
      const initialBalance = await ethers.provider.getBalance(user1.address);

      await collateralManager.connect(authorizedContract).withdrawFor(user1.address, withdrawAmount);

      const finalBalance = await ethers.provider.getBalance(user1.address);
      expect(finalBalance).to.equal(initialBalance + withdrawAmount);

      expect(await collateralManager.getCollateral(user1.address)).to.equal(ethers.parseEther("2.0"));
    });

    it("Should emit CollateralWithdrawn for withdrawFor", async function () {
      const withdrawAmount = ethers.parseEther("1.0");

      await expect(
        collateralManager.connect(authorizedContract).withdrawFor(user1.address, withdrawAmount)
      ).to.emit(collateralManager, "CollateralWithdrawn")
        .withArgs(user1.address, withdrawAmount);
    });

    it("Should revert when unauthorized tries withdrawFor", async function () {
      await expect(
        collateralManager.connect(user2).withdrawFor(user1.address, ethers.parseEther("1.0"))
      ).to.be.revertedWith("Unauthorized");
    });

    it("Should revert on invalid user address", async function () {
      await expect(
        collateralManager.connect(authorizedContract).withdrawFor(ethers.ZeroAddress, ethers.parseEther("1.0"))
      ).to.be.revertedWith("Invalid user");
    });
  });

  describe("Can Withdraw Check", function () {
    beforeEach(async function () {
      await collateralManager.setAuthorization(authorizedContract.address, true);
      await collateralManager.connect(user1).depositCollateral({ value: ethers.parseEther("4.0") });
    });

    it("Should return true when withdrawal maintains collateral ratio", async function () {
      // With 4 ETH collateral and 1 ETH debt (200% ratio)
      // Max withdrawal = 4 - (2 * 1) = 2 ETH
      const canWithdraw = await collateralManager.connect(authorizedContract).canWithdraw(
        user1.address,
        ethers.parseEther("2.0"),
        ethers.parseEther("1.0") // outstanding debt
      );
      expect(canWithdraw).to.be.true;
    });

    it("Should return false when withdrawal breaks collateral ratio", async function () {
      // With 4 ETH collateral and 1 ETH debt
      // Trying to withdraw 3 ETH would leave 1 ETH, but need 2 ETH (2 * 1 debt)
      const canWithdraw = await collateralManager.connect(authorizedContract).canWithdraw(
        user1.address,
        ethers.parseEther("3.0"),
        ethers.parseEther("1.0")
      );
      expect(canWithdraw).to.be.false;
    });

    it("Should return false when withdrawing more than balance", async function () {
      const canWithdraw = await collateralManager.connect(authorizedContract).canWithdraw(
        user1.address,
        ethers.parseEther("5.0"),
        ethers.parseEther("0")
      );
      expect(canWithdraw).to.be.false;
    });

    it("Should return true for full withdrawal with zero debt", async function () {
      const canWithdraw = await collateralManager.connect(authorizedContract).canWithdraw(
        user1.address,
        ethers.parseEther("4.0"),
        ethers.parseEther("0")
      );
      expect(canWithdraw).to.be.true;
    });

    it("Should revert when unauthorized tries canWithdraw", async function () {
      await expect(
        collateralManager.connect(user2).canWithdraw(user1.address, ethers.parseEther("1.0"), ethers.parseEther("0"))
      ).to.be.revertedWith("Unauthorized");
    });
  });

  describe("Deduct Collateral", function () {
    beforeEach(async function () {
      await collateralManager.setAuthorization(authorizedContract.address, true);
      await collateralManager.connect(user1).depositCollateral({ value: ethers.parseEther("5.0") });
    });

    it("Should allow authorized contract to deduct collateral", async function () {
      await collateralManager.connect(authorizedContract).deductCollateral(user1.address, ethers.parseEther("2.0"));

      expect(await collateralManager.getCollateral(user1.address)).to.equal(ethers.parseEther("3.0"));
    });

    it("Should revert when deducting more than balance", async function () {
      await expect(
        collateralManager.connect(authorizedContract).deductCollateral(user1.address, ethers.parseEther("6.0"))
      ).to.be.revertedWith("Insufficient collateral");
    });

    it("Should revert when unauthorized tries to deduct", async function () {
      await expect(
        collateralManager.connect(user2).deductCollateral(user1.address, ethers.parseEther("1.0"))
      ).to.be.revertedWith("Unauthorized");
    });
  });

  describe("Multiple Users", function () {
    it("Should handle multiple users independently", async function () {
      await collateralManager.connect(user1).depositCollateral({ value: ethers.parseEther("1.0") });
      await collateralManager.connect(user2).depositCollateral({ value: ethers.parseEther("2.0") });

      expect(await collateralManager.getCollateral(user1.address)).to.equal(ethers.parseEther("1.0"));
      expect(await collateralManager.getCollateral(user2.address)).to.equal(ethers.parseEther("2.0"));

      await collateralManager.connect(user1).withdrawCollateral(ethers.parseEther("0.5"));

      expect(await collateralManager.getCollateral(user1.address)).to.equal(ethers.parseEther("0.5"));
      expect(await collateralManager.getCollateral(user2.address)).to.equal(ethers.parseEther("2.0"));
    });
  });

  describe("Edge Cases", function () {
    it("Should handle very small deposits", async function () {
      const smallAmount = 1n; // 1 wei

      await collateralManager.connect(user1).depositCollateral({ value: smallAmount });
      expect(await collateralManager.getCollateral(user1.address)).to.equal(smallAmount);
    });

    it("Should handle large deposits", async function () {
      // Use a large but reasonable amount that doesn't exceed test account balance
      const largeAmount = ethers.parseEther("1000");

      await collateralManager.connect(user1).depositCollateral({ value: largeAmount });
      expect(await collateralManager.getCollateral(user1.address)).to.equal(largeAmount);
    });
  });
});
