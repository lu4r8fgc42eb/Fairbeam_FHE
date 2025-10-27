const hre = require("hardhat");

async function main() {
  const userAddress = "0xf54a85798f3Fd5b182BC4FeFFd2e996cbA92c216";

  const fheLendingAddress = "0xC84f448b99f3Ee1DB5087A8144C75666796D6f5C";
  const collateralManagerAddress = "0xEd740d737347a7e68fd9ca71DF1dC686555414bF";
  const creditScoringAddress = "0x8F1Ba4183289d913f61597C159cE04B6A34083Ad";
  const loanManagerAddress = "0x92347FAA744441cd305c8486C9e0371De9cb3272";

  const FHELending = await hre.ethers.getContractAt("FHELendingV2", fheLendingAddress);
  const CollateralManager = await hre.ethers.getContractAt("CollateralManager", collateralManagerAddress);
  const CreditScoring = await hre.ethers.getContractAt("CreditScoring", creditScoringAddress);
  const LoanManager = await hre.ethers.getContractAt("LoanManager", loanManagerAddress);

  console.log("\n=== Debugging User Status ===");
  console.log("User Address:", userAddress);
  console.log("\n--- Credit Profile ---");
  const hasProfile = await CreditScoring.hasProfile(userAddress);
  console.log("Has Profile:", hasProfile);

  console.log("\n--- Collateral ---");
  const collateral = await CollateralManager.getCollateral(userAddress);
  console.log("Collateral:", hre.ethers.formatEther(collateral), "ETH");

  console.log("\n--- Debt ---");
  const debt = await LoanManager.getOutstandingDebt(userAddress);
  console.log("Outstanding Debt:", hre.ethers.formatEther(debt), "ETH");

  console.log("\n--- Authorizations ---");
  const isAuthInLoanManager = await LoanManager.authorizedContracts(fheLendingAddress);
  console.log("FHELendingV2 authorized in LoanManager:", isAuthInLoanManager);

  const isAuthInCollateral = await CollateralManager.authorizedContracts(fheLendingAddress);
  console.log("FHELendingV2 authorized in CollateralManager:", isAuthInCollateral);

  const isAuthInCredit = await CreditScoring.authorizedContracts(fheLendingAddress);
  console.log("FHELendingV2 authorized in CreditScoring:", isAuthInCredit);

  // Check if user has any loan requests
  console.log("\n--- Loan Requests ---");
  const latestRequestId = await LoanManager.getLatestRequestId(userAddress);
  console.log("Latest Request ID:", latestRequestId.toString());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
