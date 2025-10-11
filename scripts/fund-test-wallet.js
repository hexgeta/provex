const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  const TEST_WALLET = '0xbDA5747bFD65F08deb54cb465eB87D40e51B197E';
  
  // Contract addresses
  const HEX_ADDRESS = '0x2b591e99afe9f32eaa6214f7b7629768c40eeb39';
  const HEDRON_ADDRESS = '0x3819f64f282bf135d62168C1e513280dAF905e06';
  const MAXI_ADDRESS = '0x0d86eb9f43c57f6ff3bc9e23d8f9d82503f0e84b';
  const DECI_ADDRESS = '0x6b32022693210cd2cfc466b9ac0085de8fc34ec6';
  const LUCKY_ADDRESS = '0x6b0956258ff7bd7645aa35369b55b61b8e6d6140';
  const TRIO_ADDRESS = '0xf55cd1e399e1cc3d95303048897a680be3313308';
  const BASE_ADDRESS = '0x4c54ff7f1c424ff5bf4b5ac3d4ab75b8a6c3a2d4';

  const ERC20_ABI = [
    'function balanceOf(address) view returns (uint256)',
    'function transfer(address to, uint256 amount) returns (bool)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)'
  ];

  console.log('\n💰 Funding test wallet:', TEST_WALLET);
  console.log('='.repeat(80));

  // Helper function to find and transfer tokens
  async function fundToken(tokenAddress, tokenName, whaleAddress, amountToSend) {
    try {
      // Impersonate the whale
      await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [whaleAddress],
      });

      const whale = await ethers.getSigner(whaleAddress);
      const token = new ethers.Contract(tokenAddress, ERC20_ABI, whale);
      
      const decimals = await token.decimals();
      const symbol = await token.symbol();
      const whaleBalance = await token.balanceOf(whaleAddress);
      
      console.log(`\n📍 ${tokenName} (${symbol})`);
      console.log(`  Whale: ${whaleAddress}`);
      console.log(`  Whale Balance: ${ethers.formatUnits(whaleBalance, decimals)}`);
      
      if (whaleBalance > 0n) {
        // Send the specified amount or half of whale's balance, whichever is smaller
        const amount = whaleBalance > amountToSend ? amountToSend : whaleBalance / 2n;
        const tx = await token.transfer(TEST_WALLET, amount);
        await tx.wait();
        
        const newBalance = await token.balanceOf(TEST_WALLET);
        console.log(`  ✅ Sent: ${ethers.formatUnits(amount, decimals)} ${symbol}`);
        console.log(`  📊 Test Wallet Balance: ${ethers.formatUnits(newBalance, decimals)} ${symbol}`);
      } else {
        console.log(`  ⚠️  Whale has no balance`);
      }

      // Stop impersonating
      await hre.network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [whaleAddress],
      });
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
  }

  // Known whale addresses with large balances
  // These are real addresses from PulseChain with large holdings
  
  // HEX whale
  await fundToken(
    HEX_ADDRESS,
    'HEX',
    '0x9cd83be15a79646a3d22b81fc8ddf7b7240a62cb', // Large HEX holder
    ethers.parseUnits('1000000', 8) // 1M HEX
  );

  // Hedron whale
  await fundToken(
    HEDRON_ADDRESS,
    'Hedron',
    '0x9cd83be15a79646a3d22b81fc8ddf7b7240a62cb', // Same address, might have HDRN
    ethers.parseUnits('100000', 9) // 100K HDRN
  );

  // MAXI - use the MAXI contract itself as it has tokens
  await fundToken(
    MAXI_ADDRESS,
    'MAXI',
    '0x075e72a5edf65f0a5f44699c7654c1a76941ddc8', // MAXI holder
    ethers.parseUnits('10000', 8) // 10K MAXI
  );

  // DECI
  await fundToken(
    DECI_ADDRESS,
    'DECI',
    '0x075e72a5edf65f0a5f44699c7654c1a76941ddc8', // Same holder might have DECI
    ethers.parseUnits('10000', 8) // 10K DECI
  );

  // LUCKY
  await fundToken(
    LUCKY_ADDRESS,
    'LUCKY',
    '0x075e72a5edf65f0a5f44699c7654c1a76941ddc8',
    ethers.parseUnits('10000', 8) // 10K LUCKY
  );

  // TRIO
  await fundToken(
    TRIO_ADDRESS,
    'TRIO',
    '0x075e72a5edf65f0a5f44699c7654c1a76941ddc8',
    ethers.parseUnits('10000', 8) // 10K TRIO
  );

  // BASE
  await fundToken(
    BASE_ADDRESS,
    'BASE',
    '0x075e72a5edf65f0a5f44699c7654c1a76941ddc8',
    ethers.parseUnits('10000', 8) // 10K BASE
  );

  console.log('\n' + '='.repeat(80));
  console.log('✅ Funding complete!\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

