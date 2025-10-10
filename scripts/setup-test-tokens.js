/**
 * Setup Test Tokens Script
 * 
 * This script sets up a test account with all the tokens needed for testing.
 * It impersonates whale accounts and transfers tokens to your test address.
 * 
 * Usage:
 * npx hardhat run scripts/setup-test-tokens.js --network localhost <YOUR_ADDRESS>
 */

const hre = require("hardhat");

// Known whale addresses for each token (large holders found on Etherscan/PulseScan)
// These are the actual pool contracts which hold tokens - we can impersonate them
const ETHEREUM_WHALES = {
  MAXI: "0x0d86EB9f43C57f6FF3BC9E23D8F9d82503f0e84b", // MAXI contract itself
  TRIO: "0xF55cD1e399e1cc3D95303048897a680be3313308", // TRIO contract
  BASE: "0xe9f84d418b008888a992ff8c6d22389c2c3504e0", // BASE contract
  DECI: "0x6B32022693210cD2Cfc466b9Ac0085DE8fC34eA6", // DECI contract
  LUCKY: "0x6b0956258ff7bd7645aa35369b55b61b8e6d6140", // LUCKY contract
  HEX: "0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39", // HEX contract
  TEAM: "0xb7c9e99da8a857ce576a830a9c19312114d9de02", // TEAM contract
};

const PULSECHAIN_WHALES = {
  MAXI: "0x0d86EB9f43C57f6FF3BC9E23D8F9d82503f0e84b",
  TRIO: "0xF55cD1e399e1cc3D95303048897a680be3313308",
  BASE: "0xe9f84d418b008888a992ff8c6d22389c2c3504e0",
  DECI: "0x6B32022693210cD2Cfc466b9Ac0085DE8fC34eA6",
  LUCKY: "0x6b0956258ff7bd7645aa35369b55b61b8e6d6140",
  HEX: "0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39",
  TEAM: "0xb7c9e99da8a857ce576a830a9c19312114d9de02",
};

// Token contract addresses
const TOKEN_ADDRESSES = {
  ethereum: ETHEREUM_WHALES,
  pulsechain: PULSECHAIN_WHALES,
};

// Test amounts for each token (in human-readable format)
const TEST_AMOUNTS = {
  MAXI: "1000",      // 1000 MAXI
  TRIO: "10000",     // 10,000 TRIO
  BASE: "10000",     // 10,000 BASE
  DECI: "100000",    // 100,000 DECI
  LUCKY: "10000",    // 10,000 LUCKY
  HEX: "1000000",    // 1,000,000 HEX
  TEAM: "10000",     // 10,000 TEAM
};

const TOKEN_DECIMALS = {
  MAXI: 8,
  TRIO: 8,
  BASE: 8,
  DECI: 8,
  LUCKY: 8,
  HEX: 8,
  TEAM: 8,
};

async function impersonateAndFund(address) {
  // Enable impersonation
  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [address],
  });
  
  // Fund with ETH for gas
  await hre.network.provider.send("hardhat_setBalance", [
    address,
    "0x56BC75E2D63100000", // 100 ETH
  ]);
  
  return await hre.ethers.getSigner(address);
}

async function transferToken(tokenAddress, fromSigner, toAddress, amount, decimals, symbol) {
  try {
    const tokenABI = [
      "function transfer(address to, uint256 amount) returns (bool)",
      "function balanceOf(address account) view returns (uint256)",
    ];
    
    const token = await hre.ethers.getContractAt(tokenABI, tokenAddress, fromSigner);
    
    // Check whale balance
    const whaleBalance = await token.balanceOf(fromSigner.address);
    const amountToTransfer = hre.ethers.parseUnits(amount, decimals);
    
    if (whaleBalance < amountToTransfer) {
      console.log(`   ⚠️  Whale only has ${hre.ethers.formatUnits(whaleBalance, decimals)} ${symbol}`);
      console.log(`   📤 Transferring available amount...`);
      // Transfer 10% of whale balance instead
      const transferAmount = whaleBalance / 10n;
      await token.transfer(toAddress, transferAmount);
      console.log(`   ✅ Transferred ${hre.ethers.formatUnits(transferAmount, decimals)} ${symbol}`);
    } else {
      await token.transfer(toAddress, amountToTransfer);
      console.log(`   ✅ Transferred ${amount} ${symbol}`);
    }
    
    // Check final balance
    const finalBalance = await token.balanceOf(toAddress);
    console.log(`   💰 Your balance: ${hre.ethers.formatUnits(finalBalance, decimals)} ${symbol}`);
    
    return true;
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return false;
  }
}

async function setupTestTokens(testAddress) {
  const network = hre.network.name;
  const isEthereum = network.includes('ethereum') || network === 'localhost';
  const whales = isEthereum ? ETHEREUM_WHALES : PULSECHAIN_WHALES;
  
  console.log(`\n🎯 Setting up test tokens for: ${testAddress}`);
  console.log(`Network: ${network}`);
  console.log(`Chain: ${isEthereum ? 'Ethereum' : 'PulseChain'}\n`);
  
  // Fund test address with ETH/PLS for gas
  console.log(`💰 Funding test address with ${isEthereum ? 'ETH' : 'PLS'}...`);
  await hre.network.provider.send("hardhat_setBalance", [
    testAddress,
    "0x56BC75E2D63100000", // 100 ETH/PLS
  ]);
  console.log(`   ✅ Funded with 100 ${isEthereum ? 'ETH' : 'PLS'}\n`);
  
  // Transfer each token
  for (const [symbol, whaleAddress] of Object.entries(whales)) {
    console.log(`📦 Setting up ${symbol}...`);
    console.log(`   Whale: ${whaleAddress}`);
    
    try {
      const whaleSigner = await impersonateAndFund(whaleAddress);
      const amount = TEST_AMOUNTS[symbol];
      const decimals = TOKEN_DECIMALS[symbol];
      
      await transferToken(
        whaleAddress, // Token address (same as whale in this case)
        whaleSigner,
        testAddress,
        amount,
        decimals,
        symbol
      );
    } catch (error) {
      console.log(`   ❌ Failed to setup ${symbol}: ${error.message}`);
    }
    
    console.log('');
  }
  
  console.log('✨ Setup complete!\n');
  console.log('📋 Summary:');
  console.log(`   Address: ${testAddress}`);
  console.log(`   Network: ${network}`);
  console.log(`   You now have test tokens for all pools!`);
  console.log('\n💡 Next steps:');
  console.log('   1. Connect Rabby to the local network');
  console.log('   2. Import this address or switch to it');
  console.log('   3. Test your staking features!');
  console.log('');
}

async function main() {
  // Check for address in environment variable or command line args
  const testAddress = process.env.TEST_ADDRESS || process.argv[2];
  
  if (!testAddress) {
    console.log('\n❌ Please provide a test address\n');
    console.log('Usage:');
    console.log('  TEST_ADDRESS=0xYourAddress npm run setup:tokens\n');
    console.log('OR:');
    console.log('  npx hardhat run scripts/setup-test-tokens.js --network localhost -- 0xYourAddress\n');
    console.log('Example:');
    console.log('  TEST_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb npm run setup:tokens\n');
    console.log('💡 Tip: Use any address you control. We\'ll fund it with test tokens!\n');
    return;
  }
  
  // Validate address
  if (!hre.ethers.isAddress(testAddress)) {
    console.log('\n❌ Invalid Ethereum address\n');
    return;
  }
  
  await setupTestTokens(testAddress);
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { setupTestTokens };

