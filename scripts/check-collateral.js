const hre = require("hardhat");

async function main() {
  const userAddress = "0x31ac479ab9969EdCE0fEDD946E94180dCf7d36fd"; // 部署者地址
  const fheLendingAddress = "0x69aaD7B8DA5402984130A4A22D8b271b8E4Ec04B";
  
  const FHELending = await hre.ethers.getContractAt("FHELendingV2", fheLendingAddress);
  
  console.log("\n=== Checking Collateral Data ===");
  console.log("User Address:", userAddress);
  console.log("Contract Address:", fheLendingAddress);
  
  try {
    const collateral = await FHELending.getCollateral(userAddress);
    console.log("\nCollateral (wei):", collateral.toString());
    console.log("Collateral (ETH):", hre.ethers.formatEther(collateral));
    
    const debt = await FHELending.getOutstandingDebt(userAddress);
    console.log("\nDebt (wei):", debt.toString());
    console.log("Debt (ETH):", hre.ethers.formatEther(debt));
    
    const hasProfile = await FHELending.hasProfile(userAddress);
    console.log("\nHas Credit Profile:", hasProfile);
  } catch (error) {
    console.error("\nError reading from contract:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
