const hre = require("hardhat");

async function main() {
  console.log("\n🔐 Setting up contract authorizations...\n");

  const fheLendingAddress = "0xC84f448b99f3Ee1DB5087A8144C75666796D6f5C";
  const collateralManagerAddress = "0xEd740d737347a7e68fd9ca71DF1dC686555414bF";
  const creditScoringAddress = "0x8F1Ba4183289d913f61597C159cE04B6A34083Ad";
  const loanManagerAddress = "0x92347FAA744441cd305c8486C9e0371De9cb3272";

  // Get contract instances
  const CollateralManager = await hre.ethers.getContractAt("CollateralManager", collateralManagerAddress);
  const CreditScoring = await hre.ethers.getContractAt("CreditScoring", creditScoringAddress);
  const LoanManager = await hre.ethers.getContractAt("LoanManager", loanManagerAddress);

  try {
    // Authorize FHELendingV2 in CollateralManager
    console.log("→ Authorizing FHELendingV2 in CollateralManager...");
    let tx = await CollateralManager.setAuthorization(fheLendingAddress, true);
    await tx.wait();
    console.log("✅ FHELendingV2 authorized in CollateralManager\n");

    // Authorize LoanManager in CollateralManager
    console.log("→ Authorizing LoanManager in CollateralManager...");
    tx = await CollateralManager.setAuthorization(loanManagerAddress, true);
    await tx.wait();
    console.log("✅ LoanManager authorized in CollateralManager\n");

    // Authorize FHELendingV2 in CreditScoring
    console.log("→ Authorizing FHELendingV2 in CreditScoring...");
    tx = await CreditScoring.setAuthorization(fheLendingAddress, true);
    await tx.wait();
    console.log("✅ FHELendingV2 authorized in CreditScoring\n");

    // Authorize LoanManager in CreditScoring
    console.log("→ Authorizing LoanManager in CreditScoring...");
    tx = await CreditScoring.setAuthorization(loanManagerAddress, true);
    await tx.wait();
    console.log("✅ LoanManager authorized in CreditScoring\n");

    // Authorize FHELendingV2 in LoanManager
    console.log("→ Authorizing FHELendingV2 in LoanManager...");
    tx = await LoanManager.setAuthorization(fheLendingAddress, true);
    await tx.wait();
    console.log("✅ FHELendingV2 authorized in LoanManager\n");

    console.log("✨ All authorizations set successfully!\n");
  } catch (error) {
    console.error("❌ Error setting authorizations:", error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
