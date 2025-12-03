const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("🔐 Private Lending Pool Deployment (Full Privacy)");
  console.log("=".repeat(60) + "\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "ETH\n");

  const deploymentInfo = {
    network: hre.network.name,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {},
  };

  try {
    // 1. Deploy ConfidentialETH (cETH)
    console.log("📦 Deploying ConfidentialETH (cETH)...");
    const ConfidentialETH = await hre.ethers.getContractFactory("ConfidentialETH");
    const cETH = await ConfidentialETH.deploy();
    await cETH.waitForDeployment();
    const cETHAddress = await cETH.getAddress();
    console.log("✅ ConfidentialETH:", cETHAddress, "\n");
    deploymentInfo.contracts.ConfidentialETH = cETHAddress;

    // 2. Deploy PrivateLendingPool
    console.log("📦 Deploying PrivateLendingPool...");
    const PrivateLendingPool = await hre.ethers.getContractFactory("PrivateLendingPool");
    const lendingPool = await PrivateLendingPool.deploy(cETHAddress);
    await lendingPool.waitForDeployment();
    const lendingPoolAddress = await lendingPool.getAddress();
    console.log("✅ PrivateLendingPool:", lendingPoolAddress, "\n");
    deploymentInfo.contracts.PrivateLendingPool = lendingPoolAddress;

    // Save deployment info
    const deploymentsDir = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    const deploymentFile = path.join(deploymentsDir, `${hre.network.name}-private-lending.json`);
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    console.log("💾 Deployment saved to:", deploymentFile, "\n");

    // Update frontend .env
    const frontendEnvPath = path.join(__dirname, "../frontend/.env");
    const envContent = `# Private Lending Pool (${hre.network.name}) - Full Privacy
VITE_CETH_ADDRESS=${cETHAddress}
VITE_PRIVATE_LENDING_POOL_ADDRESS=${lendingPoolAddress}

# Legacy contracts (for reference)
VITE_FHELENDING_ADDRESS=${lendingPoolAddress}
VITE_COLLATERAL_MANAGER_ADDRESS=${lendingPoolAddress}
VITE_LIQUIDITY_POOL_ADDRESS=${lendingPoolAddress}

# Network Configuration
VITE_CHAIN_ID=11155111
VITE_CHAIN_NAME=Sepolia
VITE_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com

# FHE Gateway
VITE_GATEWAY_URL=https://gateway.sepolia.zama.ai

# WalletConnect Project ID
VITE_WALLETCONNECT_PROJECT_ID=
`;

    fs.writeFileSync(frontendEnvPath, envContent);
    console.log("💾 Frontend .env updated\n");

    console.log("=".repeat(60));
    console.log("🎉 DEPLOYMENT SUCCESSFUL!");
    console.log("=".repeat(60));
    console.log("\n📋 Contract Addresses:");
    console.log("  ConfidentialETH (cETH):  ", cETHAddress);
    console.log("  PrivateLendingPool:      ", lendingPoolAddress);
    console.log("\n🔐 Privacy Features:");
    console.log("  ✓ Collateral amounts: ENCRYPTED");
    console.log("  ✓ Borrow amounts: ENCRYPTED");
    console.log("  ✓ Debt balances: ENCRYPTED");
    console.log("  ✓ Repayment amounts: ENCRYPTED");
    console.log("  ✓ Supply amounts: ENCRYPTED");
    console.log("\n📝 User Flow:");
    console.log("  1. Wrap ETH -> cETH (cETH.wrap())");
    console.log("  2. Approve pool (cETH.setApprovalForAll(pool, true))");
    console.log("  3. Deposit collateral (encrypted)");
    console.log("  4. Borrow cETH (encrypted)");
    console.log("  5. Repay debt (encrypted)");
    console.log("  6. Withdraw collateral (encrypted)");
    console.log("  7. Unwrap cETH -> ETH when ready\n");

  } catch (error) {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
