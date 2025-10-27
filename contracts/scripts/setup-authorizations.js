const hre = require("hardhat");

async function main() {
  console.log("\n🔐 Setting up contract authorizations...\n");

  const fheLendingAddress = "0xAB09E3AF93Cbe8C2a62128f8f437236c87F8f869";
  const collateralManagerAddress = "0xfbC6E332646E9164D568900c2Fbf7bf61DaEB5bc";
  const creditScoringAddress = "0xAe13671Acbc8A1598a51d3c5986990E182021f22";
  const loanManagerAddress = "0x5F50dE4ee610deB2a8513155F1eca7E5C53d7C35";

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

    // Authorize FHELendingV2 in CreditScoring
    console.log("→ Authorizing FHELendingV2 in CreditScoring...");
    tx = await CreditScoring.setAuthorization(fheLendingAddress, true);
    await tx.wait();
    console.log("✅ FHELendingV2 authorized in CreditScoring\n");

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
