const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("🚀 FHE Lending with Decrypt Flow Deployment");
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
    // Deploy CollateralManager
    console.log("📦 Deploying CollateralManager...");
    const CollateralManager = await hre.ethers.getContractFactory("CollateralManager");
    const collateralManager = await CollateralManager.deploy();
    await collateralManager.waitForDeployment();
    const collateralAddress = await collateralManager.getAddress();
    console.log("✅ CollateralManager:", collateralAddress, "\n");
    deploymentInfo.contracts.CollateralManager = collateralAddress;

    // Deploy LiquidityPool
    console.log("📦 Deploying LiquidityPool...");
    const LiquidityPool = await hre.ethers.getContractFactory("LiquidityPool");
    const liquidityPool = await LiquidityPool.deploy();
    await liquidityPool.waitForDeployment();
    const liquidityPoolAddress = await liquidityPool.getAddress();
    console.log("✅ LiquidityPool:", liquidityPoolAddress, "\n");
    deploymentInfo.contracts.LiquidityPool = liquidityPoolAddress;

    // Deploy FHELendingWithDecrypt
    console.log("📦 Deploying FHELendingWithDecrypt (Main Contract)...");
    const FHELendingWithDecrypt = await hre.ethers.getContractFactory("FHELendingWithDecrypt");
    const fheLending = await FHELendingWithDecrypt.deploy(
      collateralAddress,
      liquidityPoolAddress
    );
    await fheLending.waitForDeployment();
    const fheLendingAddress = await fheLending.getAddress();
    console.log("✅ FHELendingWithDecrypt:", fheLendingAddress, "\n");
    deploymentInfo.contracts.FHELendingWithDecrypt = fheLendingAddress;

    console.log("🔐 Setting up authorizations...\n");

    console.log("  → Authorizing FHELendingWithDecrypt in CollateralManager...");
    await (await collateralManager.setAuthorization(fheLendingAddress, true)).wait();
    console.log("  ✓ Done");

    console.log("  → Authorizing FHELendingWithDecrypt in LiquidityPool...");
    await (await liquidityPool.setAuthorization(fheLendingAddress, true)).wait();
    console.log("  ✓ Done\n");

    // Save deployment info
    const deploymentsDir = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    const deploymentFile = path.join(deploymentsDir, `${hre.network.name}-fhe-decrypt.json`);
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    console.log("💾 Deployment saved to:", deploymentFile, "\n");

    // Update frontend .env
    const frontendEnvPath = path.join(__dirname, "../../frontend/.env");
    const envContent = `# FHE Lending with Decrypt (${hre.network.name})
VITE_FHELENDING_ADDRESS=${fheLendingAddress}
VITE_COLLATERAL_MANAGER_ADDRESS=${collateralAddress}
VITE_LIQUIDITY_POOL_ADDRESS=${liquidityPoolAddress}

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
    console.log("  CollateralManager:     ", collateralAddress);
    console.log("  LiquidityPool:         ", liquidityPoolAddress);
    console.log("  FHELendingWithDecrypt: ", fheLendingAddress);
    console.log("\n📝 Next Steps:");
    console.log("  1. Add liquidity: npx hardhat run scripts/add-liquidity-fhe.js --network sepolia");
    console.log("  2. Start frontend: cd ../frontend && npm run dev\n");

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
