const hre = require("hardhat");

async function main() {
  const fheLendingAddress = "0xC84f448b99f3Ee1DB5087A8144C75666796D6f5C";
  const loanManagerAddress = "0x92347FAA744441cd305c8486C9e0371De9cb3272";

  const LoanManager = await hre.ethers.getContractAt("LoanManager", loanManagerAddress);

  console.log("\n=== Checking Authorizations ===");
  console.log("FHELendingV2:", fheLendingAddress);
  console.log("LoanManager:", loanManagerAddress);

  // Check if FHELendingV2 is authorized in LoanManager
  const isAuthorized = await LoanManager.authorizedContracts(fheLendingAddress);
  console.log("\nIs FHELendingV2 authorized in LoanManager?", isAuthorized);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
