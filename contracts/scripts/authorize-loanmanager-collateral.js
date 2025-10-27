const hre = require("hardhat");

async function main() {
  console.log("\n🔐 Authorizing LoanManager in CollateralManager...\n");

  const collateralManagerAddress = "0xEd740d737347a7e68fd9ca71DF1dC686555414bF";
  const loanManagerAddress = "0x92347FAA744441cd305c8486C9e0371De9cb3272";

  const CollateralManager = await hre.ethers.getContractAt("CollateralManager", collateralManagerAddress);

  try {
    const tx = await CollateralManager.setAuthorization(loanManagerAddress, true);
    console.log("Transaction sent:", tx.hash);

    await tx.wait();
    console.log("✅ LoanManager authorized in CollateralManager\n");

    // Verify
    const isAuth = await CollateralManager.authorizedContracts(loanManagerAddress);
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
