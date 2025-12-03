const hre = require("hardhat");

async function main() {
  console.log("\n🔐 Authorizing LoanManager in CreditScoring...\n");

  const creditScoringAddress = "0x8F1Ba4183289d913f61597C159cE04B6A34083Ad";
  const loanManagerAddress = "0x92347FAA744441cd305c8486C9e0371De9cb3272";

  const CreditScoring = await hre.ethers.getContractAt("CreditScoring", creditScoringAddress);

  try {
    const tx = await CreditScoring.setAuthorization(loanManagerAddress, true);
    console.log("Transaction sent:", tx.hash);

    await tx.wait();
    console.log("✅ LoanManager authorized in CreditScoring\n");

    // Verify
    const isAuth = await CreditScoring.authorizedContracts(loanManagerAddress);
    console.log("Verification - Is Authorized:", isAuth);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
