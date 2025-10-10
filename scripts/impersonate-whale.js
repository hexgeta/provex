/**
 * Impersonate Whale Script
 * 
 * Impersonate a real address that holds tokens and fund it with gas.
 * This is better than transferring tokens since we avoid hardfork issues.
 * 
 * Usage:
 * TEST_ADDRESS=0xYourAddress npm run impersonate:whale
 */

const hre = require("hardhat");

// Known addresses with significant token holdings on PulseChain/Ethereum
const WHALE_ADDRESSES = {
  // These are the pool contracts themselves - they hold their own tokens
  MAXI_HOLDER: "0x0d86EB9f43C57f6FF3BC9E23D8F9d82503f0e84b",
  TRIO_HOLDER: "0xF55cD1e399e1cc3D95303048897a680be3313308",
  BASE_HOLDER: "0xe9f84d418b008888a992ff8c6d22389c2c3504e0",
  DECI_HOLDER: "0x6B32022693210cD2Cfc466b9Ac0085DE8fC34eA6",
  LUCKY_HOLDER: "0x6b0956258ff7bd7645aa35369b55b61b8e6d6140",
  
  // Real whale addresses (found from blockchain explorers)
  // You can replace these with addresses you find that have stakes
  GENERAL_WHALE_1: "0x1a2B3c4D5e6F7a8B9c0D1e2F3a4B5c6D7e8F9a0B", // Replace with real
  GENERAL_WHALE_2: "0x2B3c4D5e6F7a8B9c0D1e2F3a4B5c6D7e8F9a0B1C", // Replace with real
};

async function impersonateAddress(address) {
  console.log(`\n🎭 Impersonating: ${address}`);
  
  try {
    // Enable impersonation
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [address],
    });
    
    // Fund with native currency for gas (100 ETH/PLS)
    await hre.network.provider.send("hardhat_setBalance", [
      address,
      "0x56BC75E2D63100000", // 100 ETH/PLS
    ]);
    
    console.log(`✅ Successfully impersonated ${address}`);
    console.log(`💰 Funded with 100 PLS for gas`);
    console.log(`\n📝 Now you can:`);
    console.log(`   1. Import this address in Rabby (if you want)`);
    console.log(`   2. Or just connect your wallet and interact normally`);
    console.log(`   3. The impersonated address will have its mainnet token balances!`);
    
    return await hre.ethers.getSigner(address);
  } catch (error) {
    console.log(`❌ Error impersonating: ${error.message}`);
    return null;
  }
}

async function main() {
  const targetAddress = process.env.TEST_ADDRESS;
  
  if (!targetAddress) {
    console.log('\n❌ Please provide an address to impersonate\n');
    console.log('Usage:');
    console.log('  TEST_ADDRESS=0xYourAddress npm run impersonate:whale\n');
    console.log('Examples:');
    console.log('  # Impersonate MAXI pool (has MAXI tokens)');
    console.log('  TEST_ADDRESS=0x0d86EB9f43C57f6FF3BC9E23D8F9d82503f0e84b npm run impersonate:whale\n');
    console.log('Available whales:');
    Object.entries(WHALE_ADDRESSES).forEach(([name, addr]) => {
      console.log(`  ${name}: ${addr}`);
    });
    console.log('');
    return;
  }
  
  // Validate address
  if (!hre.ethers.isAddress(targetAddress)) {
    console.log('\n❌ Invalid Ethereum address\n');
    return;
  }
  
  await impersonateAddress(targetAddress);
  
  console.log('\n💡 Pro tip:');
  console.log('   - The impersonated address keeps its real mainnet balances');
  console.log('   - You can test transactions as if you were that address');
  console.log('   - Restart the fork to reset everything\n');
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { impersonateAddress };

