const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  const TEST_WALLET = '0xbDA5747bFD65F08deb54cb465eB87D40e51B197E';
  const HEX_ADDRESS = '0x2b591e99afe9f32eaa6214f7b7629768c40eeb39';
  
  const ERC20_ABI = [
    'function balanceOf(address) view returns (uint256)',
    'function transfer(address to, uint256 amount) returns (bool)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)'
  ];

  console.log('\n💰 Sending HEX to test wallet:', TEST_WALLET);
  console.log('='.repeat(80));

  const hex = new ethers.Contract(HEX_ADDRESS, ERC20_ABI, ethers.provider);
  const hexDecimals = await hex.decimals();
  
  // HEX whale address (a large holder)
  const HEX_WHALE = '0x9cd83be15a79646a3d22b81fc8ddf7b7240a62cb';
  const hexWhaleBalance = await hex.balanceOf(HEX_WHALE);
  
  console.log(`\nHEX Whale (${HEX_WHALE})`);
  console.log(`Balance: ${ethers.formatUnits(hexWhaleBalance, hexDecimals)} HEX`);
  
  if (hexWhaleBalance > 0n) {
    // Impersonate HEX whale
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [HEX_WHALE],
    });
    
    // Set balance for whale to pay for gas
    console.log(`\n⛽ Setting PLS balance for whale...`);
    await hre.network.provider.send("hardhat_setBalance", [
      HEX_WHALE,
      "0x" + (100000n * 10n**18n).toString(16), // 100,000 PLS
    ]);

    const hexWhale = await ethers.getSigner(HEX_WHALE);
    const hexWithSigner = new ethers.Contract(HEX_ADDRESS, ERC20_ABI, hexWhale);
    
    // Send available HEX to test wallet (whale has 278,387 HEX)
    const hexAmount = ethers.parseUnits('200000', hexDecimals); // Send 200K HEX
    console.log(`📤 Sending 200,000 HEX to test wallet...`);
    
    const tx = await hexWithSigner.transfer(TEST_WALLET, hexAmount);
    await tx.wait();
    
    const testWalletHexBalance = await hex.balanceOf(TEST_WALLET);
    console.log(`\n✅ Success! Transaction hash: ${tx.hash}`);
    console.log(`📊 Test Wallet HEX Balance: ${ethers.formatUnits(testWalletHexBalance, hexDecimals)} HEX`);

    await hre.network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [HEX_WHALE],
    });
  } else {
    console.log('\n❌ Whale has no HEX balance');
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Done!\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

