const { expect } = require("chai");
const { ethers, fhevm } = require("hardhat");

describe("FHELendingWithDecrypt", function () {
  let fheLending;
  let collateralManager;
  let liquidityPool;
  let owner;
  let borrower;
  let lender;
  let user2;

  beforeEach(async function () {
    [owner, borrower, lender, user2] = await ethers.getSigners();

    // Initialize FHE mock API if in mock mode
    if (fhevm.isMock) {
      await fhevm.initializeCLIApi();
    }

    // Deploy CollateralManager
    const CollateralManager = await ethers.getContractFactory("CollateralManager");
    collateralManager = await CollateralManager.deploy();
    await collateralManager.waitForDeployment();

    // Deploy LiquidityPool
    const LiquidityPool = await ethers.getContractFactory("LiquidityPool");
    liquidityPool = await LiquidityPool.deploy();
    await liquidityPool.waitForDeployment();

    // Deploy FHELendingWithDecrypt
    const FHELendingWithDecrypt = await ethers.getContractFactory("FHELendingWithDecrypt");
    fheLending = await FHELendingWithDecrypt.deploy(
      await collateralManager.getAddress(),
      await liquidityPool.getAddress()
    );
    await fheLending.waitForDeployment();

    // Authorize FHELending to manage collateral and liquidity
    await collateralManager.setAuthorization(await fheLending.getAddress(), true);
    await liquidityPool.setAuthorization(await fheLending.getAddress(), true);

    // Add initial liquidity to the pool
    await liquidityPool.connect(lender).addLiquidity({ value: ethers.parseEther("100.0") });
  });

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await fheLending.owner()).to.equal(owner.address);
    });

    it("Should set the correct collateral manager", async function () {
      expect(await fheLending.collateralManager()).to.equal(await collateralManager.getAddress());
    });

    it("Should set the correct liquidity pool", async function () {
      expect(await fheLending.liquidityPool()).to.equal(await liquidityPool.getAddress());
    });

    it("Should have 200% collateral ratio", async function () {
      expect(await fheLending.COLLATERAL_RATIO()).to.equal(200);
    });
  });

  describe("Collateral Management", function () {
    it("Should allow user to deposit collateral", async function () {
      const depositAmount = ethers.parseEther("10.0");

      await fheLending.connect(borrower).depositCollateral({ value: depositAmount });

      expect(await fheLending.getCollateral(borrower.address)).to.equal(depositAmount);
    });

    it("Should emit CollateralDeposited event", async function () {
      const depositAmount = ethers.parseEther("5.0");

      await expect(
        fheLending.connect(borrower).depositCollateral({ value: depositAmount })
      ).to.emit(fheLending, "CollateralDeposited")
        .withArgs(borrower.address, depositAmount);
    });

    it("Should revert on zero deposit", async function () {
      await expect(
        fheLending.connect(borrower).depositCollateral({ value: 0 })
      ).to.be.revertedWithCustomError(fheLending, "ZeroAmount");
    });

    it("Should allow withdrawal when no debt", async function () {
      // Deposit collateral
      await fheLending.connect(borrower).depositCollateral({ value: ethers.parseEther("10.0") });

      // Withdraw
      const initialBalance = await ethers.provider.getBalance(borrower.address);
      const tx = await fheLending.connect(borrower).withdrawCollateral(ethers.parseEther("5.0"));
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;

      const finalBalance = await ethers.provider.getBalance(borrower.address);
      expect(finalBalance).to.be.closeTo(initialBalance + ethers.parseEther("5.0") - gasUsed, ethers.parseEther("0.001"));
    });

    it("Should emit CollateralWithdrawn event", async function () {
      await fheLending.connect(borrower).depositCollateral({ value: ethers.parseEther("10.0") });

      await expect(
        fheLending.connect(borrower).withdrawCollateral(ethers.parseEther("3.0"))
      ).to.emit(fheLending, "CollateralWithdrawn")
        .withArgs(borrower.address, ethers.parseEther("3.0"));
    });

    it("Should revert on zero withdrawal", async function () {
      await fheLending.connect(borrower).depositCollateral({ value: ethers.parseEther("10.0") });

      await expect(
        fheLending.connect(borrower).withdrawCollateral(0)
      ).to.be.revertedWithCustomError(fheLending, "ZeroAmount");
    });
  });

  describe("Borrow Request (FHE)", function () {
    beforeEach(async function () {
      // Deposit collateral for borrower
      await fheLending.connect(borrower).depositCollateral({ value: ethers.parseEther("10.0") });
    });

    it("Should allow user to submit encrypted borrow request", async function () {
      const borrowAmount = ethers.parseEther("2.0"); // 20% of collateral

      // Create encrypted input
      const input = await fhevm.createEncryptedInput(
        await fheLending.getAddress(),
        borrower.address
      );
      input.add64(borrowAmount);
      const encryptedInput = await input.encrypt();

      // Submit borrow request
      const tx = await fheLending.connect(borrower).requestBorrow(
        encryptedInput.handles[0],
        encryptedInput.inputProof
      );
      await tx.wait();

      // Verify request exists
      expect(await fheLending.hasActiveRequest(borrower.address)).to.be.true;
    });

    it("Should emit BorrowRequested event", async function () {
      const borrowAmount = ethers.parseEther("1.0");

      const input = await fhevm.createEncryptedInput(
        await fheLending.getAddress(),
        borrower.address
      );
      input.add64(borrowAmount);
      const encryptedInput = await input.encrypt();

      await expect(
        fheLending.connect(borrower).requestBorrow(
          encryptedInput.handles[0],
          encryptedInput.inputProof
        )
      ).to.emit(fheLending, "BorrowRequested");
    });

    it("Should revert borrow request without collateral", async function () {
      const input = await fhevm.createEncryptedInput(
        await fheLending.getAddress(),
        user2.address
      );
      input.add64(ethers.parseEther("1.0"));
      const encryptedInput = await input.encrypt();

      await expect(
        fheLending.connect(user2).requestBorrow(
          encryptedInput.handles[0],
          encryptedInput.inputProof
        )
      ).to.be.revertedWithCustomError(fheLending, "InsufficientCollateral");
    });
  });

  describe("Claim Borrowed Funds", function () {
    beforeEach(async function () {
      // Deposit collateral
      await fheLending.connect(borrower).depositCollateral({ value: ethers.parseEther("10.0") });

      // Submit borrow request
      const borrowAmount = ethers.parseEther("2.0");
      const input = await fhevm.createEncryptedInput(
        await fheLending.getAddress(),
        borrower.address
      );
      input.add64(borrowAmount);
      const encryptedInput = await input.encrypt();

      await fheLending.connect(borrower).requestBorrow(
        encryptedInput.handles[0],
        encryptedInput.inputProof
      );
    });

    it("Should allow user to claim borrowed funds with plaintext amount", async function () {
      const claimAmount = ethers.parseEther("2.0");
      const initialBalance = await ethers.provider.getBalance(borrower.address);

      const tx = await fheLending.connect(borrower).claimBorrowedFunds(claimAmount);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;

      const finalBalance = await ethers.provider.getBalance(borrower.address);
      expect(finalBalance).to.be.closeTo(initialBalance + claimAmount - gasUsed, ethers.parseEther("0.001"));
    });

    it("Should emit FundsClaimed event", async function () {
      const claimAmount = ethers.parseEther("2.0");

      await expect(
        fheLending.connect(borrower).claimBorrowedFunds(claimAmount)
      ).to.emit(fheLending, "FundsClaimed")
        .withArgs(borrower.address, claimAmount);
    });

    it("Should update debt after claiming", async function () {
      const claimAmount = ethers.parseEther("2.0");

      await fheLending.connect(borrower).claimBorrowedFunds(claimAmount);

      expect(await fheLending.getOutstandingDebt(borrower.address)).to.equal(claimAmount);
    });

    it("Should mark request as claimed", async function () {
      await fheLending.connect(borrower).claimBorrowedFunds(ethers.parseEther("2.0"));

      expect(await fheLending.hasActiveRequest(borrower.address)).to.be.false;
    });

    it("Should revert on double claim", async function () {
      await fheLending.connect(borrower).claimBorrowedFunds(ethers.parseEther("2.0"));

      await expect(
        fheLending.connect(borrower).claimBorrowedFunds(ethers.parseEther("1.0"))
      ).to.be.revertedWithCustomError(fheLending, "AlreadyClaimed");
    });

    it("Should revert when no active request", async function () {
      await expect(
        fheLending.connect(user2).claimBorrowedFunds(ethers.parseEther("1.0"))
      ).to.be.revertedWithCustomError(fheLending, "NoActiveRequest");
    });

    it("Should revert on zero claim amount", async function () {
      await expect(
        fheLending.connect(borrower).claimBorrowedFunds(0)
      ).to.be.revertedWithCustomError(fheLending, "ZeroAmount");
    });

    it("Should revert when exceeding collateral limit", async function () {
      // Max borrowable with 10 ETH collateral at 200% ratio = 5 ETH
      await expect(
        fheLending.connect(borrower).claimBorrowedFunds(ethers.parseEther("6.0"))
      ).to.be.revertedWithCustomError(fheLending, "ExceedsCollateralLimit");
    });

    it("Should revert when pool has insufficient liquidity", async function () {
      // Drain the pool first
      await liquidityPool.connect(lender).removeLiquidity(ethers.parseEther("99.0"));

      await expect(
        fheLending.connect(borrower).claimBorrowedFunds(ethers.parseEther("2.0"))
      ).to.be.revertedWithCustomError(fheLending, "InsufficientLiquidity");
    });
  });

  describe("Repayment", function () {
    beforeEach(async function () {
      // Setup: deposit, borrow, and claim
      await fheLending.connect(borrower).depositCollateral({ value: ethers.parseEther("10.0") });

      const input = await fhevm.createEncryptedInput(
        await fheLending.getAddress(),
        borrower.address
      );
      input.add64(ethers.parseEther("3.0"));
      const encryptedInput = await input.encrypt();

      await fheLending.connect(borrower).requestBorrow(
        encryptedInput.handles[0],
        encryptedInput.inputProof
      );

      await fheLending.connect(borrower).claimBorrowedFunds(ethers.parseEther("3.0"));
    });

    it("Should allow full repayment", async function () {
      const repayAmount = ethers.parseEther("3.0");

      await fheLending.connect(borrower).repay({ value: repayAmount });

      expect(await fheLending.getOutstandingDebt(borrower.address)).to.equal(0);
    });

    it("Should allow partial repayment", async function () {
      const repayAmount = ethers.parseEther("1.0");

      await fheLending.connect(borrower).repay({ value: repayAmount });

      expect(await fheLending.getOutstandingDebt(borrower.address)).to.equal(ethers.parseEther("2.0"));
    });

    it("Should emit Repaid event", async function () {
      const repayAmount = ethers.parseEther("2.0");

      await expect(
        fheLending.connect(borrower).repay({ value: repayAmount })
      ).to.emit(fheLending, "Repaid")
        .withArgs(borrower.address, repayAmount);
    });

    it("Should return excess repayment", async function () {
      const debtAmount = ethers.parseEther("3.0");
      const overpayAmount = ethers.parseEther("5.0");
      const initialBalance = await ethers.provider.getBalance(borrower.address);

      const tx = await fheLending.connect(borrower).repay({ value: overpayAmount });
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;

      const finalBalance = await ethers.provider.getBalance(borrower.address);
      // Should only lose the debt amount plus gas
      expect(finalBalance).to.be.closeTo(initialBalance - debtAmount - gasUsed, ethers.parseEther("0.001"));
    });

    it("Should revert on zero repayment", async function () {
      await expect(
        fheLending.connect(borrower).repay({ value: 0 })
      ).to.be.revertedWithCustomError(fheLending, "ZeroAmount");
    });

    it("Should revert when no debt to repay", async function () {
      // Repay all first
      await fheLending.connect(borrower).repay({ value: ethers.parseEther("3.0") });

      // Try to repay again
      await expect(
        fheLending.connect(borrower).repay({ value: ethers.parseEther("1.0") })
      ).to.be.revertedWithCustomError(fheLending, "NoDebtToRepay");
    });
  });

  describe("Collateral Withdrawal with Debt", function () {
    beforeEach(async function () {
      // Setup: deposit, borrow, and claim
      await fheLending.connect(borrower).depositCollateral({ value: ethers.parseEther("10.0") });

      const input = await fhevm.createEncryptedInput(
        await fheLending.getAddress(),
        borrower.address
      );
      input.add64(ethers.parseEther("2.0"));
      const encryptedInput = await input.encrypt();

      await fheLending.connect(borrower).requestBorrow(
        encryptedInput.handles[0],
        encryptedInput.inputProof
      );

      await fheLending.connect(borrower).claimBorrowedFunds(ethers.parseEther("2.0"));
      // Now: 10 ETH collateral, 2 ETH debt
      // Min collateral = 2 * 2 = 4 ETH (200% ratio)
      // Max withdrawal = 10 - 4 = 6 ETH
    });

    it("Should allow withdrawal that maintains collateral ratio", async function () {
      // Can withdraw up to 6 ETH
      await fheLending.connect(borrower).withdrawCollateral(ethers.parseEther("5.0"));

      expect(await fheLending.getCollateral(borrower.address)).to.equal(ethers.parseEther("5.0"));
    });

    it("Should revert when withdrawal breaks collateral ratio", async function () {
      // Trying to withdraw 7 ETH would leave 3 ETH collateral
      // But need 4 ETH minimum (200% of 2 ETH debt)
      await expect(
        fheLending.connect(borrower).withdrawCollateral(ethers.parseEther("7.0"))
      ).to.be.revertedWithCustomError(fheLending, "InsufficientCollateral");
    });
  });

  describe("Max Borrowable", function () {
    it("Should calculate max borrowable correctly with no debt", async function () {
      await fheLending.connect(borrower).depositCollateral({ value: ethers.parseEther("10.0") });

      // Max = 10 ETH * 100 / 200 = 5 ETH
      expect(await fheLending.getMaxBorrowable(borrower.address)).to.equal(ethers.parseEther("5.0"));
    });

    it("Should calculate max borrowable correctly with existing debt", async function () {
      await fheLending.connect(borrower).depositCollateral({ value: ethers.parseEther("10.0") });

      // Borrow 2 ETH
      const input = await fhevm.createEncryptedInput(
        await fheLending.getAddress(),
        borrower.address
      );
      input.add64(ethers.parseEther("2.0"));
      const encryptedInput = await input.encrypt();

      await fheLending.connect(borrower).requestBorrow(
        encryptedInput.handles[0],
        encryptedInput.inputProof
      );
      await fheLending.connect(borrower).claimBorrowedFunds(ethers.parseEther("2.0"));

      // Max = 5 ETH - 2 ETH = 3 ETH remaining
      expect(await fheLending.getMaxBorrowable(borrower.address)).to.equal(ethers.parseEther("3.0"));
    });

    it("Should be limited by pool liquidity", async function () {
      // Deposit large collateral
      await fheLending.connect(borrower).depositCollateral({ value: ethers.parseEther("500.0") });

      // Max by collateral = 250 ETH, but pool only has 100 ETH
      expect(await fheLending.getMaxBorrowable(borrower.address)).to.equal(ethers.parseEther("100.0"));
    });

    it("Should return 0 for user without collateral", async function () {
      expect(await fheLending.getMaxBorrowable(user2.address)).to.equal(0);
    });
  });

  describe("Available Liquidity", function () {
    it("Should return pool balance as available liquidity", async function () {
      expect(await fheLending.getAvailableLiquidity()).to.equal(ethers.parseEther("100.0"));
    });
  });

  describe("Encrypted Handles", function () {
    beforeEach(async function () {
      await fheLending.connect(borrower).depositCollateral({ value: ethers.parseEther("10.0") });

      const input = await fhevm.createEncryptedInput(
        await fheLending.getAddress(),
        borrower.address
      );
      input.add64(ethers.parseEther("2.0"));
      const encryptedInput = await input.encrypt();

      await fheLending.connect(borrower).requestBorrow(
        encryptedInput.handles[0],
        encryptedInput.inputProof
      );
    });

    it("Should return borrow amount handle", async function () {
      const handle = await fheLending.getBorrowAmountHandle(borrower.address);
      expect(handle).to.not.equal(0n);
    });

    it("Should return encrypted debt handle after claiming", async function () {
      await fheLending.connect(borrower).claimBorrowedFunds(ethers.parseEther("2.0"));

      const handle = await fheLending.getTotalDebtHandle(borrower.address);
      expect(handle).to.not.equal(0n);
    });
  });

  describe("Multiple Borrows", function () {
    beforeEach(async function () {
      await fheLending.connect(borrower).depositCollateral({ value: ethers.parseEther("20.0") });
    });

    it("Should accumulate debt over multiple borrows", async function () {
      // First borrow
      let input = await fhevm.createEncryptedInput(
        await fheLending.getAddress(),
        borrower.address
      );
      input.add64(ethers.parseEther("2.0"));
      let encryptedInput = await input.encrypt();

      await fheLending.connect(borrower).requestBorrow(
        encryptedInput.handles[0],
        encryptedInput.inputProof
      );
      await fheLending.connect(borrower).claimBorrowedFunds(ethers.parseEther("2.0"));

      // Second borrow
      input = await fhevm.createEncryptedInput(
        await fheLending.getAddress(),
        borrower.address
      );
      input.add64(ethers.parseEther("3.0"));
      encryptedInput = await input.encrypt();

      await fheLending.connect(borrower).requestBorrow(
        encryptedInput.handles[0],
        encryptedInput.inputProof
      );
      await fheLending.connect(borrower).claimBorrowedFunds(ethers.parseEther("3.0"));

      expect(await fheLending.getOutstandingDebt(borrower.address)).to.equal(ethers.parseEther("5.0"));
    });
  });

  describe("Edge Cases", function () {
    it("Should handle minimum borrow amount", async function () {
      await fheLending.connect(borrower).depositCollateral({ value: ethers.parseEther("10.0") });

      const minAmount = 1n; // 1 wei

      const input = await fhevm.createEncryptedInput(
        await fheLending.getAddress(),
        borrower.address
      );
      input.add64(minAmount);
      const encryptedInput = await input.encrypt();

      await fheLending.connect(borrower).requestBorrow(
        encryptedInput.handles[0],
        encryptedInput.inputProof
      );

      await fheLending.connect(borrower).claimBorrowedFunds(minAmount);

      expect(await fheLending.getOutstandingDebt(borrower.address)).to.equal(minAmount);
    });
  });
});
