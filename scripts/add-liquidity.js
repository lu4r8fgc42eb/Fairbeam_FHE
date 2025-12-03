const hre = require("hardhat");

async function main() {
  console.log("\n💧 Adding liquidity to pool...\n");

  const liquidityPoolAddress = "0x719626f27e436696a974fe5ea476c841Cdbe10f1";
  const amount = hre.ethers.parseEther("0.1"); // Add 0.1 ETH

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
