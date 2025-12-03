const hre = require("hardhat");

async function main() {
  const userAddress = "0xf54a85798f3Fd5b182BC4FeFFd2e996cbA92c216";
  const creditScoringAddress = "0xAe13671Acbc8A1598a51d3c5986990E182021f22";
  const fheLendingAddress = "0xAB09E3AF93Cbe8C2a62128f8f437236c87F8f869";
  
  const CreditScoring = await hre.ethers.getContractAt("CreditScoring", creditScoringAddress);
  const FHELending = await hre.ethers.getContractAt("FHELendingV2", fheLendingAddress);
  
  console.log("\n=== Checking User Status ===");
  console.log("User Address:", userAddress);
  
  // Check if has profile
  const hasProfile = await CreditScoring.hasProfile(userAddress);
  console.log("\nHas Credit Profile (CreditScoring):", hasProfile);
  
  // Check via FHELending
  const hasProfileViaMain = await FHELending.hasProfile(userAddress);
  console.log("Has Credit Profile (FHELendingV2):", hasProfileViaMain);
  
  // Check collateral
  const collateral = await FHELending.getCollateral(userAddress);
  console.log("\nCollateral:", hre.ethers.formatEther(collateral), "ETH");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
