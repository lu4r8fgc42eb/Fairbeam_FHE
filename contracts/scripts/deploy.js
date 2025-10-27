const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("\n🚀 Starting FHE Lending Platform Deployment...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "ETH\n");

  if (balance < hre.ethers.parseEther("0.05")) {
    console.log("⚠️  Warning: Balance is low. Get testnet ETH from: https://sepoliafaucet.com/\n");
  }

  const deploymentInfo = {
    network: hre.network.name,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {}
  };

  try {
    console.log("📦 Deploying CollateralManager...");
    const CollateralManager = await hre.ethers.getContractFactory("CollateralManager");
    const collateralManager = await CollateralManager.deploy();
    await collateralManager.waitForDeployment();
    const collateralAddress = await collateralManager.getAddress();
    console.log("✅ CollateralManager deployed to:", collateralAddress, "\n");
    deploymentInfo.contracts.CollateralManager = collateralAddress;

    console.log("📦 Deploying CreditScoring...");
    const CreditScoring = await hre.ethers.getContractFactory("CreditScoring");
    const creditScoring = await CreditScoring.deploy();
    await creditScoring.waitForDeployment();
    const creditScoringAddress = await creditScoring.getAddress();
    console.log("✅ CreditScoring deployed to:", creditScoringAddress, "\n");
    deploymentInfo.contracts.CreditScoring = creditScoringAddress;

    console.log("📦 Deploying LoanManager...");
    const LoanManager = await hre.ethers.getContractFactory("LoanManager");
    const loanManager = await LoanManager.deploy(creditScoringAddress, collateralAddress);
    await loanManager.waitForDeployment();
    const loanManagerAddress = await loanManager.getAddress();
    console.log("✅ LoanManager deployed to:", loanManagerAddress, "\n");
    deploymentInfo.contracts.LoanManager = loanManagerAddress;

    console.log("📦 Deploying LiquidityPool...");
    const LiquidityPool = await hre.ethers.getContractFactory("LiquidityPool");
    const liquidityPool = await LiquidityPool.deploy();
    await liquidityPool.waitForDeployment();
    const liquidityPoolAddress = await liquidityPool.getAddress();
    console.log("✅ LiquidityPool deployed to:", liquidityPoolAddress, "\n");
    deploymentInfo.contracts.LiquidityPool = liquidityPoolAddress;

    console.log("📦 Deploying FHELendingV2 (Main Contract)...");
    const FHELendingV2 = await hre.ethers.getContractFactory("FHELendingV2");
    const fheLending = await FHELendingV2.deploy(
      collateralAddress,
      creditScoringAddress,
      loanManagerAddress,
      liquidityPoolAddress
    );
    await fheLending.waitForDeployment();
    const fheLendingAddress = await fheLending.getAddress();
    console.log("✅ FHELendingV2 deployed to:", fheLendingAddress, "\n");
    deploymentInfo.contracts.FHELendingV2 = fheLendingAddress;

    console.log("🔐 Setting up contract authorizations...\n");

    console.log("  → Authorizing FHELendingV2 in CollateralManager...");
    await (await collateralManager.setAuthorization(fheLendingAddress, true)).wait();
    console.log("  ✓ Done");

    console.log("  → Authorizing LoanManager in CollateralManager...");
    await (await collateralManager.setAuthorization(loanManagerAddress, true)).wait();
    console.log("  ✓ Done");

    console.log("  → Authorizing LoanManager in CreditScoring...");
    await (await creditScoring.setAuthorization(loanManagerAddress, true)).wait();
    console.log("  ✓ Done");

    console.log("  → Authorizing FHELendingV2 in CreditScoring...");
    await (await creditScoring.setAuthorization(fheLendingAddress, true)).wait();
    console.log("  ✓ Done");

    console.log("  → Authorizing FHELendingV2 in LoanManager...");
    await (await loanManager.setAuthorization(fheLendingAddress, true)).wait();
    console.log("  ✓ Done");

    console.log("  → Authorizing FHELendingV2 in LiquidityPool...");
    await (await liquidityPool.setAuthorization(fheLendingAddress, true)).wait();
    console.log("  ✓ Done");

    console.log("  → Authorizing LoanManager in LiquidityPool...");
    await (await liquidityPool.setAuthorization(loanManagerAddress, true)).wait();
    console.log("  ✓ Done\n");

    const deploymentsDir = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    const deploymentFile = path.join(deploymentsDir, `${hre.network.name}.json`);
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    console.log("💾 Deployment info saved to:", deploymentFile, "\n");

    const frontendEnvPath = path.join(__dirname, "../../frontend/.env");
    const envContent = `# Contract Addresses (${hre.network.name})
VITE_FHELENDING_V2_ADDRESS=${fheLendingAddress}
VITE_COLLATERAL_MANAGER_ADDRESS=${collateralAddress}
VITE_CREDIT_SCORING_ADDRESS=${creditScoringAddress}
VITE_LOAN_MANAGER_ADDRESS=${loanManagerAddress}
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
    console.log("  CollateralManager:  ", collateralAddress);
    console.log("  CreditScoring:      ", creditScoringAddress);
    console.log("  LoanManager:        ", loanManagerAddress);
    console.log("  LiquidityPool:      ", liquidityPoolAddress);
    console.log("  FHELendingV2 (Main):", fheLendingAddress);
    console.log("\n📝 Next Steps:");
    console.log("  1. cd ../frontend && npm run dev");
    console.log("  2. Add liquidity to pool for testing\n");

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
