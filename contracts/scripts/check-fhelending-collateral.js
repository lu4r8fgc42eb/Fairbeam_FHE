const hre = require("hardhat");

async function main() {
  const fheLendingAddress = "0x69aaD7B8DA5402984130A4A22D8b271b8E4Ec04B";
  const collateralManagerAddress = "0x352c8E07e81e192C91ee2879EBd9376fB9522ea7";
  
  const CollateralManager = await hre.ethers.getContractAt("CollateralManager", collateralManagerAddress);
  
  console.log("\n=== Checking FHELendingV2's Collateral (Bug!) ===");
  console.log("FHELendingV2 Address:", fheLendingAddress);
  
  const collateral = await CollateralManager.getCollateral(fheLendingAddress);
  console.log("\nCollateral recorded under FHELendingV2 (wei):", collateral.toString());
  console.log("Collateral recorded under FHELendingV2 (ETH):", hre.ethers.formatEther(collateral));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
