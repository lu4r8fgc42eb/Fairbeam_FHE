const hre = require("hardhat");

async function main() {
  const userAddress = "0xf54a85798f3Fd5b182BC4FeFFd2e996cbA92c216"; // 从截图看到的地址
  const creditScoringAddress = "0xAe13671Acbc8A1598a51d3c5986990E182021f22";
  
  const CreditScoring = await hre.ethers.getContractAt("CreditScoring", creditScoringAddress);
  
  console.log("\n=== Checking Credit Profile ===");
  console.log("User Address:", userAddress);
  
  const hasProfile = await CreditScoring.hasProfile(userAddress);
  console.log("Has Profile:", hasProfile);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
