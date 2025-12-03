const { expect } = require("chai");
const { ethers, fhevm } = require("hardhat");

describe("CreditScoring", function () {
  let creditScoring;
  let owner;
  let user1;
  let user2;
  let authorizedContract;

  beforeEach(async function () {
    [owner, user1, user2, authorizedContract] = await ethers.getSigners();

    // Initialize FHE mock API if in mock mode
    if (fhevm.isMock) {
      await fhevm.initializeCLIApi();
    }

    // Deploy CreditScoring contract
    const CreditScoring = await ethers.getContractFactory("CreditScoring");
    creditScoring = await CreditScoring.deploy();
    await creditScoring.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await creditScoring.owner()).to.equal(owner.address);
    });

    it("Should start with no authorized contracts", async function () {
      expect(await creditScoring.authorizedContracts(user1.address)).to.be.false;
    });
  });

  describe("Authorization", function () {
    it("Should allow owner to authorize contracts", async function () {
      await creditScoring.setAuthorization(authorizedContract.address, true);
      expect(await creditScoring.authorizedContracts(authorizedContract.address)).to.be.true;
    });

    it("Should allow owner to revoke authorization", async function () {
      await creditScoring.setAuthorization(authorizedContract.address, true);
      await creditScoring.setAuthorization(authorizedContract.address, false);
      expect(await creditScoring.authorizedContracts(authorizedContract.address)).to.be.false;
    });

    it("Should reject non-owner authorization attempts", async function () {
      await expect(
        creditScoring.connect(user1).setAuthorization(authorizedContract.address, true)
      ).to.be.reverted;
    });
  });

  describe("Profile Submission", function () {
    it("Should allow user to submit encrypted credit profile", async function () {
      const riskScore = 500; // Medium risk score

      // Create encrypted input
      const input = await fhevm.createEncryptedInput(
        await creditScoring.getAddress(),
        user1.address
      );
      input.add16(riskScore);
      const encryptedInput = await input.encrypt();

      // Submit profile
      const tx = await creditScoring.connect(user1).submitProfile(
        encryptedInput.handles[0],
        encryptedInput.inputProof
      );
      await tx.wait();

      // Verify profile exists
      expect(await creditScoring.hasProfile(user1.address)).to.be.true;
    });

    it("Should emit ProfileSubmitted event on submission", async function () {
      const riskScore = 300;

      const input = await fhevm.createEncryptedInput(
        await creditScoring.getAddress(),
        user1.address
      );
      input.add16(riskScore);
      const encryptedInput = await input.encrypt();

      await expect(
        creditScoring.connect(user1).submitProfile(
          encryptedInput.handles[0],
          encryptedInput.inputProof
        )
      ).to.emit(creditScoring, "ProfileSubmitted").withArgs(user1.address);
    });

    it("Should allow different users to submit their own profiles", async function () {
      // User1 submits profile
      const input1 = await fhevm.createEncryptedInput(
        await creditScoring.getAddress(),
        user1.address
      );
      input1.add16(400);
      const encrypted1 = await input1.encrypt();
      await creditScoring.connect(user1).submitProfile(
        encrypted1.handles[0],
        encrypted1.inputProof
      );

      // User2 submits profile
      const input2 = await fhevm.createEncryptedInput(
        await creditScoring.getAddress(),
        user2.address
      );
      input2.add16(600);
      const encrypted2 = await input2.encrypt();
      await creditScoring.connect(user2).submitProfile(
        encrypted2.handles[0],
        encrypted2.inputProof
      );

      // Both should have profiles
      expect(await creditScoring.hasProfile(user1.address)).to.be.true;
      expect(await creditScoring.hasProfile(user2.address)).to.be.true;
    });
  });

  describe("Profile Update", function () {
    beforeEach(async function () {
      // Submit initial profile
      const input = await fhevm.createEncryptedInput(
        await creditScoring.getAddress(),
        user1.address
      );
      input.add16(500);
      const encrypted = await input.encrypt();
      await creditScoring.connect(user1).submitProfile(
        encrypted.handles[0],
        encrypted.inputProof
      );
    });

    it("Should allow user to update their profile", async function () {
      const newRiskScore = 400;

      const input = await fhevm.createEncryptedInput(
        await creditScoring.getAddress(),
        user1.address
      );
      input.add16(newRiskScore);
      const encrypted = await input.encrypt();

      const tx = await creditScoring.connect(user1).updateProfile(
        encrypted.handles[0],
        encrypted.inputProof
      );
      await tx.wait();

      // Profile should still exist
      expect(await creditScoring.hasProfile(user1.address)).to.be.true;
    });

    it("Should emit ProfileUpdated event on update", async function () {
      const input = await fhevm.createEncryptedInput(
        await creditScoring.getAddress(),
        user1.address
      );
      input.add16(350);
      const encrypted = await input.encrypt();

      await expect(
        creditScoring.connect(user1).updateProfile(
          encrypted.handles[0],
          encrypted.inputProof
        )
      ).to.emit(creditScoring, "ProfileUpdated").withArgs(user1.address);
    });

    it("Should revert when updating non-existent profile", async function () {
      const input = await fhevm.createEncryptedInput(
        await creditScoring.getAddress(),
        user2.address
      );
      input.add16(400);
      const encrypted = await input.encrypt();

      await expect(
        creditScoring.connect(user2).updateProfile(
          encrypted.handles[0],
          encrypted.inputProof
        )
      ).to.be.revertedWithCustomError(creditScoring, "NoProfile");
    });
  });

  describe("Risk Score Access", function () {
    beforeEach(async function () {
      // Submit profile for user1
      const input = await fhevm.createEncryptedInput(
        await creditScoring.getAddress(),
        user1.address
      );
      input.add16(500);
      const encrypted = await input.encrypt();
      await creditScoring.connect(user1).submitProfile(
        encrypted.handles[0],
        encrypted.inputProof
      );

      // Authorize a contract
      await creditScoring.setAuthorization(authorizedContract.address, true);
    });

    it("Should allow authorized contract to access risk score", async function () {
      // Authorized contract should be able to call getRiskScore
      const riskScoreHandle = await creditScoring
        .connect(authorizedContract)
        .getRiskScore(user1.address);
      expect(riskScoreHandle).to.not.equal(0n);
    });

    it("Should allow owner to access risk score", async function () {
      const riskScoreHandle = await creditScoring.getRiskScore(user1.address);
      expect(riskScoreHandle).to.not.equal(0n);
    });

    it("Should revert when unauthorized user tries to access risk score", async function () {
      await expect(
        creditScoring.connect(user2).getRiskScore(user1.address)
      ).to.be.revertedWith("Unauthorized");
    });

    it("Should revert when accessing risk score for non-existent profile", async function () {
      await expect(
        creditScoring.connect(authorizedContract).getRiskScore(user2.address)
      ).to.be.revertedWithCustomError(creditScoring, "NoProfile");
    });
  });

  describe("Profile Metadata", function () {
    it("Should return correct profile metadata timestamps", async function () {
      const input = await fhevm.createEncryptedInput(
        await creditScoring.getAddress(),
        user1.address
      );
      input.add16(500);
      const encrypted = await input.encrypt();

      const submitTx = await creditScoring.connect(user1).submitProfile(
        encrypted.handles[0],
        encrypted.inputProof
      );
      const submitReceipt = await submitTx.wait();
      const submitBlock = await ethers.provider.getBlock(submitReceipt.blockNumber);

      const [submittedAt, updatedAt] = await creditScoring.getProfileMetadata(user1.address);

      expect(submittedAt).to.equal(submitBlock.timestamp);
      expect(updatedAt).to.equal(submitBlock.timestamp);
    });

    it("Should update updatedAt timestamp on profile update", async function () {
      // Submit profile
      const input1 = await fhevm.createEncryptedInput(
        await creditScoring.getAddress(),
        user1.address
      );
      input1.add16(500);
      const encrypted1 = await input1.encrypt();
      await creditScoring.connect(user1).submitProfile(
        encrypted1.handles[0],
        encrypted1.inputProof
      );

      const [initialSubmittedAt, initialUpdatedAt] = await creditScoring.getProfileMetadata(user1.address);

      // Wait a bit and update
      await ethers.provider.send("evm_increaseTime", [100]);
      await ethers.provider.send("evm_mine");

      // Update profile
      const input2 = await fhevm.createEncryptedInput(
        await creditScoring.getAddress(),
        user1.address
      );
      input2.add16(400);
      const encrypted2 = await input2.encrypt();
      await creditScoring.connect(user1).updateProfile(
        encrypted2.handles[0],
        encrypted2.inputProof
      );

      const [newSubmittedAt, newUpdatedAt] = await creditScoring.getProfileMetadata(user1.address);

      // submittedAt should remain same, updatedAt should be newer
      expect(newSubmittedAt).to.equal(initialSubmittedAt);
      expect(newUpdatedAt).to.be.gt(initialUpdatedAt);
    });

    it("Should revert when getting metadata for non-existent profile", async function () {
      await expect(
        creditScoring.getProfileMetadata(user2.address)
      ).to.be.revertedWithCustomError(creditScoring, "NoProfile");
    });
  });

  describe("Edge Cases", function () {
    it("Should handle minimum risk score (0)", async function () {
      const input = await fhevm.createEncryptedInput(
        await creditScoring.getAddress(),
        user1.address
      );
      input.add16(0);
      const encrypted = await input.encrypt();

      await creditScoring.connect(user1).submitProfile(
        encrypted.handles[0],
        encrypted.inputProof
      );

      expect(await creditScoring.hasProfile(user1.address)).to.be.true;
    });

    it("Should handle maximum risk score (65535)", async function () {
      const input = await fhevm.createEncryptedInput(
        await creditScoring.getAddress(),
        user1.address
      );
      input.add16(65535);
      const encrypted = await input.encrypt();

      await creditScoring.connect(user1).submitProfile(
        encrypted.handles[0],
        encrypted.inputProof
      );

      expect(await creditScoring.hasProfile(user1.address)).to.be.true;
    });

    it("Should allow user to overwrite their profile with new submission", async function () {
      // First submission
      const input1 = await fhevm.createEncryptedInput(
        await creditScoring.getAddress(),
        user1.address
      );
      input1.add16(500);
      const encrypted1 = await input1.encrypt();
      await creditScoring.connect(user1).submitProfile(
        encrypted1.handles[0],
        encrypted1.inputProof
      );

      // Second submission (overwrite)
      const input2 = await fhevm.createEncryptedInput(
        await creditScoring.getAddress(),
        user1.address
      );
      input2.add16(300);
      const encrypted2 = await input2.encrypt();
      await creditScoring.connect(user1).submitProfile(
        encrypted2.handles[0],
        encrypted2.inputProof
      );

      expect(await creditScoring.hasProfile(user1.address)).to.be.true;
    });
  });
});
