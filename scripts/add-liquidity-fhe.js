const hre = require("hardhat");

async function main() {
  console.log("\n💧 Adding liquidity to FHE pool...\n");

  const liquidityPoolAddress = "0xaF948a62E7deA38edB61Bde3149Fb59c7CD07a97";
  const amount = hre.ethers.parseEther("0.05"); // Add 0.05 ETH

  const LiquidityPool = await hre.ethers.getContractAt("LiquidityPool", liquidityPoolAddress);

  try {
    console.log("Adding", hre.ethers.formatEther(amount), "ETH to liquidity pool...");
    const tx = await LiquidityPool.addLiquidity({ value: amount });
    console.log("Transaction sent:", tx.hash);

    await tx.wait();
    console.log("✅ Liquidity added successfully!\n");

    const totalLiquidity = await LiquidityPool.getTotalLiquidity();
    console.log("Total pool liquidity:", hre.ethers.formatEther(totalLiquidity), "ETH\n");
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
