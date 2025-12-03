const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer address:", deployer.address);
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Balance:", hre.ethers.formatEther(balance), "ETH");
  
  if (balance < hre.ethers.parseEther("0.05")) {
    console.log("\n⚠️  Warning: Balance is low for deployment!");
    console.log("Get testnet ETH from: https://sepoliafaucet.com/");
  } else {
    console.log("\n✅ Balance is sufficient for deployment");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
