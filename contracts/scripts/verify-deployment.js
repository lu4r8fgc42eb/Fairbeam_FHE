const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("\n🔍 Verifying Deployment...\n");

  const deploymentFile = path.join(__dirname, "../deployments/sepolia.json");
  if (!fs.existsSync(deploymentFile)) {
    console.error("❌ Deployment file not found!");
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  console.log("📋 Deployment Info:");
  console.log("  Network:", deployment.network);
  console.log("  Deployer:", deployment.deployer);
  console.log("  Timestamp:", deployment.timestamp);
  console.log();

  const contracts = deployment.contracts;

  for (const [name, address] of Object.entries(contracts)) {
    try {
      const code = await hre.ethers.provider.getCode(address);
      if (code === "0x") {
        console.log(`❌ ${name}: No code at ${address}`);
      } else {
        console.log(`✅ ${name}: ${address}`);
      }
    } catch (error) {
      console.log(`❌ ${name}: Error checking ${address}`);
    }
  }

  console.log("\n🔗 Sepolia Etherscan Links:");
  for (const [name, address] of Object.entries(contracts)) {
    console.log(`  ${name}: https://sepolia.etherscan.io/address/${address}`);
  }

  console.log("\n✅ Verification Complete!");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
