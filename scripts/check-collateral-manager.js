const hre = require("hardhat");

async function main() {
  const userAddress = "0x31ac479ab9969EdCE0fEDD946E94180dCf7d36fd";
  const collateralManagerAddress = "0x352c8E07e81e192C91ee2879EBd9376fB9522ea7";
  
  const CollateralManager = await hre.ethers.getContractAt("CollateralManager", collateralManagerAddress);
  
  console.log("\n=== Checking CollateralManager ===");
  console.log("User Address:", userAddress);
  console.log("Contract Address:", collateralManagerAddress);
  
  try {
    const collateral = await CollateralManager.getCollateral(userAddress);
    console.log("\nCollateral in Manager (wei):", collateral.toString());
    console.log("Collateral in Manager (ETH):", hre.ethers.formatEther(collateral));
  } catch (error) {
    console.error("\nError:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
