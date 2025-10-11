const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  const TEST_WALLET = '0xbDA5747bFD65F08deb54cb465eB87D40e51B197E';
  const TRIO_ADDRESS = '0xf55cd1e399e1cc3d95303048897a680be3313308';
  const HEX_ADDRESS = '0x2b591e99afe9f32eaa6214f7b7629768c40eeb39';
  
  const ERC20_ABI = [
    'function balanceOf(address) view returns (uint256)',
    'function transfer(address to, uint256 amount) returns (bool)',
    'function approve(address spender, uint256 amount) returns (bool)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)',
    'function totalSupply() view returns (uint256)'
  ];

  console.log('\n💰 Getting 999 TRIO tokens for test wallet:', TEST_WALLET);
  console.log('='.repeat(80));

  // Step 1: Get HEX first
  console.log('\n📍 Step 1: Getting HEX tokens...');
  const hex = new ethers.Contract(HEX_ADDRESS, ERC20_ABI, ethers.provider);
  const hexDecimals = await hex.decimals();
  
  // HEX whale address
  const HEX_WHALE = '0x9cd83be15a79646a3d22b81fc8ddf7b7240a62cb';
  const hexWhaleBalance = await hex.balanceOf(HEX_WHALE);
  
  console.log(`HEX Whale Balance: ${ethers.formatUnits(hexWhaleBalance, hexDecimals)} HEX`);
  
  if (hexWhaleBalance > 0n) {
    // Impersonate HEX whale
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [HEX_WHALE],
    });

    const hexWhale = await ethers.getSigner(HEX_WHALE);
    const hexWithSigner = new ethers.Contract(HEX_ADDRESS, ERC20_ABI, hexWhale);
    
    // Send 100,000 HEX to test wallet
    const hexAmount = ethers.parseUnits('100000', hexDecimals);
    console.log(`\n📤 Sending 100,000 HEX to test wallet...`);
    
    const tx = await hexWithSigner.transfer(TEST_WALLET, hexAmount);
    await tx.wait();
    
    const testWalletHexBalance = await hex.balanceOf(TEST_WALLET);
    console.log(`✅ Test Wallet HEX Balance: ${ethers.formatUnits(testWalletHexBalance, hexDecimals)} HEX`);

    await hre.network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [HEX_WHALE],
    });
  }

  // Step 2: Check TRIO balance now
  console.log('\n📍 Step 2: Checking TRIO balances in the wild...');
  const trio = new ethers.Contract(TRIO_ADDRESS, ERC20_ABI, ethers.provider);
  const trioDecimals = await trio.decimals();
  const trioTotalSupply = await trio.totalSupply();
  
  console.log(`TRIO Total Supply: ${ethers.formatUnits(trioTotalSupply, trioDecimals)}`);
  console.log(`TRIO Contract Balance: ${ethers.formatUnits(await trio.balanceOf(TRIO_ADDRESS), trioDecimals)}`);
  
  // Check if any account from Hardhat has TRIO
  const accounts = await ethers.getSigners();
  console.log('\nChecking Hardhat accounts for TRIO...');
  
  for (let i = 0; i < Math.min(5, accounts.length); i++) {
    const balance = await trio.balanceOf(accounts[i].address);
    if (balance > 0n) {
      console.log(`Account ${i} (${accounts[i].address}): ${ethers.formatUnits(balance, trioDecimals)} TRIO`);
      
      // Transfer to test wallet
      if (balance >= ethers.parseUnits('999', trioDecimals)) {
        const trioWithSigner = new ethers.Contract(TRIO_ADDRESS, ERC20_ABI, accounts[i]);
        const tx = await trioWithSigner.transfer(TEST_WALLET, ethers.parseUnits('999', trioDecimals));
        await tx.wait();
        
        const testBalance = await trio.balanceOf(TEST_WALLET);
        console.log(`\n✅ Sent 999 TRIO to test wallet!`);
        console.log(`📊 Test Wallet TRIO Balance: ${ethers.formatUnits(testBalance, trioDecimals)} TRIO`);
        console.log('\n' + '='.repeat(80));
        return;
      }
    }
  }

  console.log('\n⚠️  No TRIO tokens found in Hardhat accounts.');
  console.log('ℹ️  TRIO tokens are locked in the pool contract and can only be obtained by:');
  console.log('   1. Pledging HEX during the minting phase');
  console.log('   2. Buying from someone who already has TRIO');
  console.log('   3. The pool is currently active, so TRIO is not available for minting.');
  
  console.log('\n📊 Final balances:');
  const finalHexBalance = await hex.balanceOf(TEST_WALLET);
  const finalTrioBalance = await trio.balanceOf(TEST_WALLET);
  console.log(`  HEX:  ${ethers.formatUnits(finalHexBalance, hexDecimals)}`);
  console.log(`  TRIO: ${ethers.formatUnits(finalTrioBalance, trioDecimals)}`);
  
  console.log('\n' + '='.repeat(80));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

