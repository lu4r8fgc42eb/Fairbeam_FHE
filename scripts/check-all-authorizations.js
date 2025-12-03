const hre = require("hardhat");

async function main() {
  const fheLendingAddress = "0xC84f448b99f3Ee1DB5087A8144C75666796D6f5C";
  const collateralManagerAddress = "0xEd740d737347a7e68fd9ca71DF1dC686555414bF";
  const creditScoringAddress = "0x8F1Ba4183289d913f61597C159cE04B6A34083Ad";
  const loanManagerAddress = "0x92347FAA744441cd305c8486C9e0371De9cb3272";

  const CollateralManager = await hre.ethers.getContractAt("CollateralManager", collateralManagerAddress);
  const CreditScoring = await hre.ethers.getContractAt("CreditScoring", creditScoringAddress);
  const LoanManager = await hre.ethers.getContractAt("LoanManager", loanManagerAddress);

  console.log("\n=== Checking All Authorizations ===\n");

  console.log("--- FHELendingV2 Authorizations ---");
  const fheInCollateral = await CollateralManager.authorizedContracts(fheLendingAddress);
  console.log("✓ In CollateralManager:", fheInCollateral);

  const fheInCredit = await CreditScoring.authorizedContracts(fheLendingAddress);
  console.log("✓ In CreditScoring:", fheInCredit);

  const fheInLoan = await LoanManager.authorizedContracts(fheLendingAddress);
  console.log("✓ In LoanManager:", fheInLoan);

  console.log("\n--- LoanManager Authorizations ---");
  const loanInCollateral = await CollateralManager.authorizedContracts(loanManagerAddress);
  console.log("✓ In CollateralManager:", loanInCollateral);

  const loanInCredit = await CreditScoring.authorizedContracts(loanManagerAddress);
  console.log("✓ In CreditScoring:", loanInCredit);

  console.log("\n--- Summary ---");
  const allAuthorized =
    fheInCollateral && fheInCredit && fheInLoan &&
    loanInCollateral && loanInCredit;

  if (allAuthorized) {
    console.log("✅ All authorizations are correct!");
  } else {
    console.log("❌ Some authorizations are missing!");
    if (!loanInCredit) {
      console.log("   → LoanManager NOT authorized in CreditScoring!");
    }
    if (!loanInCollateral) {
      console.log("   → LoanManager NOT authorized in CollateralManager!");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
