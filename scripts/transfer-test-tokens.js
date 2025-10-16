/**
 * Transfer Test Tokens Script
 * Transfers TEAM and BASE tokens from real holders to test account
 */

const hre = require("hardhat");

// Real whale addresses found on PulseScan with large holdings
const REAL_HOLDERS = {
  // BASE pool contract holds BASE tokens
  BASE: "0x196e5f240d26969cfef464e80c6e423620cc7e40", // Mystery Box Address (large BASE holder)
  // TEAM holders
  TEAM: "0x1f12dae5450522b445fe1882c4f8d2cf67b38a43", // Large TEAM holder
  // HEX for testing
  HEX: "0x9e49c0f7a6e6c89e283f802fb7f6e72d99f8c9d1", // Known HEX whale
};

const TOKEN_ADDRESSES = {
  BASE: "0xe9f84d418b008888a992ff8c6d22389c2c3504e0",
  TEAM: "0xb7c9e99da8a857ce576a830a9c19312114d9de02",
  HEX: "0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39",
};

async function main() {
  const testAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  
  console.log(`\n🎯 Transferring tokens to: ${testAddress}\n`);
  
  const tokenABI = [
    "function transfer(address to, uint256 amount) returns (bool)",
    "function balanceOf(address account) view returns (uint256)",
    "function decimals() view returns (uint8)",
  ];
  
  // Transfer BASE
  try {
    console.log("📦 Transferring BASE...");
    const baseHolder = REAL_HOLDERS.BASE;
    
    // Impersonate holder
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [baseHolder],
    });
    
    // Fund with gas
    await hre.network.provider.send("hardhat_setBalance", [
      baseHolder,
      "0x56BC75E2D63100000", // 100 ETH
    ]);
    
    const holderSigner = await hre.ethers.getSigner(baseHolder);
    const baseToken = await hre.ethers.getContractAt(TOKEN_ADDRESSES.BASE, TOKEN_ADDRESSES.BASE, holderSigner);
    
    const holderBalance = await baseToken.balanceOf(baseHolder);
    console.log(`   Holder has: ${hre.ethers.formatUnits(holderBalance, 8)} BASE`);
    
    // Transfer 10% of balance
    const transferAmount = holderBalance / 10n;
    await baseToken.transfer(testAddress, transferAmount);
    
    const yourBalance = await baseToken.balanceOf(testAddress);
    console.log(`   ✅ Transferred ${hre.ethers.formatUnits(transferAmount, 8)} BASE`);
    console.log(`   💰 Your balance: ${hre.ethers.formatUnits(yourBalance, 8)} BASE\n`);
  } catch (error) {
    console.log(`   ❌ BASE transfer failed: ${error.message}\n`);
  }
  
  // Transfer TEAM
  try {
    console.log("📦 Transferring TEAM...");
    const teamHolder = REAL_HOLDERS.TEAM;
    
    // Impersonate holder
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [teamHolder],
    });
    
    // Fund with gas
    await hre.network.provider.send("hardhat_setBalance", [
      teamHolder,
      "0x56BC75E2D63100000", // 100 ETH
    ]);
    
    const holderSigner = await hre.ethers.getSigner(teamHolder);
    const teamToken = await hre.ethers.getContractAt(TOKEN_ADDRESSES.TEAM, TOKEN_ADDRESSES.TEAM, holderSigner);
    
    const holderBalance = await teamToken.balanceOf(teamHolder);
    console.log(`   Holder has: ${hre.ethers.formatUnits(holderBalance, 8)} TEAM`);
    
    // Transfer 10% of balance
    const transferAmount = holderBalance / 10n;
    await teamToken.transfer(testAddress, transferAmount);
    
    const yourBalance = await teamToken.balanceOf(testAddress);
    console.log(`   ✅ Transferred ${hre.ethers.formatUnits(transferAmount, 8)} TEAM`);
    console.log(`   💰 Your balance: ${hre.ethers.formatUnits(yourBalance, 8)} TEAM\n`);
  } catch (error) {
    console.log(`   ❌ TEAM transfer failed: ${error.message}\n`);
  }
  
  console.log("✨ Done!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

