/**
 * Mint Tokens From Thin Air
 * Uses Hardhat's storage manipulation to give any address tokens
 */

const hre = require("hardhat");

const TOKEN_ADDRESSES = {
  BASE: "0xe9f84d418b008888a992ff8c6d22389c2c3504e0",
  TEAM: "0xb7c9e99da8a857ce576a830a9c19312114d9de02",
  HEX: "0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39",
};

// Standard ERC20 uses slot 0 for balances mapping
// balanceOf[address] is stored at keccak256(address + slot)
function getStorageSlot(address, mappingSlot) {
  return hre.ethers.solidityPackedKeccak256(
    ["uint256", "uint256"],
    [address, mappingSlot]
  );
}

async function setTokenBalance(tokenAddress, userAddress, amount, decimals = 8) {
  const amountBN = hre.ethers.parseUnits(amount.toString(), decimals);
  
  // Try different storage slots (ERC20 tokens typically use slot 0-3 for balances)
  for (let slot = 0; slot < 10; slot++) {
    try {
      const storageSlot = getStorageSlot(userAddress, slot);
      
      // Set the storage value
      await hre.network.provider.send("hardhat_setStorageAt", [
        tokenAddress,
        storageSlot,
        hre.ethers.zeroPadValue(hre.ethers.toBeHex(amountBN), 32),
      ]);
      
      // Verify it worked
      const tokenABI = ["function balanceOf(address) view returns (uint256)"];
      const token = await hre.ethers.getContractAt(tokenABI, tokenAddress);
      const balance = await token.balanceOf(userAddress);
      
      if (balance > 0n) {
        return { success: true, slot, balance };
      }
    } catch (e) {
      continue;
    }
  }
  
  return { success: false };
}

async function main() {
  const testAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  
  console.log(`\n✨ Creating tokens from thin air for: ${testAddress}\n`);
  
  // BASE tokens
  console.log("📦 Creating BASE tokens...");
  const baseResult = await setTokenBalance(TOKEN_ADDRESSES.BASE, testAddress, "100000", 8);
  if (baseResult.success) {
    console.log(`   ✅ Created ${hre.ethers.formatUnits(baseResult.balance, 8)} BASE (slot ${baseResult.slot})`);
  } else {
    console.log(`   ❌ Failed to create BASE`);
  }
  
  // TEAM tokens
  console.log("\n📦 Creating TEAM tokens...");
  const teamResult = await setTokenBalance(TOKEN_ADDRESSES.TEAM, testAddress, "100000", 8);
  if (teamResult.success) {
    console.log(`   ✅ Created ${hre.ethers.formatUnits(teamResult.balance, 8)} TEAM (slot ${teamResult.slot})`);
  } else {
    console.log(`   ❌ Failed to create TEAM`);
  }
  
  // HEX tokens (bonus!)
  console.log("\n📦 Creating HEX tokens...");
  const hexResult = await setTokenBalance(TOKEN_ADDRESSES.HEX, testAddress, "10000000", 8);
  if (hexResult.success) {
    console.log(`   ✅ Created ${hre.ethers.formatUnits(hexResult.balance, 8)} HEX (slot ${hexResult.slot})`);
  } else {
    console.log(`   ❌ Failed to create HEX`);
  }
  
  console.log("\n🎉 Tokens created from thin air!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

