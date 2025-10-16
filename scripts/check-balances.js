const hre = require("hardhat");

const TOKEN_ADDRESSES = {
  BASE: "0xe9f84d418b008888a992ff8c6d22389c2c3504e0",
  TEAM: "0xb7c9e99da8a857ce576a830a9c19312114d9de02",
  HEX: "0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39",
};

async function main() {
  const address = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  
  console.log(`\n📊 Balances for: ${address}\n`);
  
  // Native PLS
  const plsBalance = await hre.ethers.provider.getBalance(address);
  console.log(`💰 PLS (native):  ${hre.ethers.formatEther(plsBalance)} PLS`);
  
  // ERC-20 tokens
  const tokenABI = ["function balanceOf(address) view returns (uint256)"];
  
  for (const [symbol, tokenAddress] of Object.entries(TOKEN_ADDRESSES)) {
    try {
      const token = await hre.ethers.getContractAt(tokenABI, tokenAddress);
      const balance = await token.balanceOf(address);
      console.log(`💰 ${symbol}:           ${hre.ethers.formatUnits(balance, 8)} ${symbol}`);
    } catch (e) {
      console.log(`❌ ${symbol}:           Error reading balance`);
    }
  }
  
  console.log('\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

