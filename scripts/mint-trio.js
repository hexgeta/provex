const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  const TEST_WALLET = '0xbDA5747bFD65F08deb54cb465eB87D40e51B197E';
  const TRIO_ADDRESS = '0xf55cd1e399e1cc3d95303048897a680be3313308';
  
  const ERC20_ABI = [
    'function balanceOf(address) view returns (uint256)',
    'function transfer(address to, uint256 amount) returns (bool)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)',
    'function totalSupply() view returns (uint256)'
  ];

  console.log('\n💰 Minting 999 TRIO to test wallet:', TEST_WALLET);
  console.log('='.repeat(80));

  // Try to find a whale with TRIO tokens
  const trio = new ethers.Contract(TRIO_ADDRESS, ERC20_ABI, ethers.provider);
  const decimals = await trio.decimals();
  const totalSupply = await trio.totalSupply();
  
  console.log(`\nTRIO Total Supply: ${ethers.formatUnits(totalSupply, decimals)}`);
  
  // Known addresses that might have TRIO
  const potentialWhales = [
    '0x075e72a5edf65f0a5f44699c7654c1a76941ddc8',
    '0x9cd83be15a79646a3d22b81fc8ddf7b7240a62cb',
    '0x2b591e99afe9f32eaa6214f7b7629768c40eeb39', // HEX contract
    TRIO_ADDRESS, // The contract itself
  ];

  let whaleFound = false;
  
  for (const whaleAddress of potentialWhales) {
    try {
      const balance = await trio.balanceOf(whaleAddress);
      console.log(`Checking ${whaleAddress}: ${ethers.formatUnits(balance, decimals)} TRIO`);
      
      if (balance > ethers.parseUnits('999', decimals)) {
        console.log(`\n✅ Found whale with sufficient balance!`);
        
        // Impersonate the whale
        await hre.network.provider.request({
          method: "hardhat_impersonateAccount",
          params: [whaleAddress],
        });

        const whale = await ethers.getSigner(whaleAddress);
        const trioWithSigner = new ethers.Contract(TRIO_ADDRESS, ERC20_ABI, whale);
        
        const amountToSend = ethers.parseUnits('999', decimals);
        console.log(`\n📤 Sending 999 TRIO from ${whaleAddress}...`);
        
        const tx = await trioWithSigner.transfer(TEST_WALLET, amountToSend);
        await tx.wait();
        
        const newBalance = await trio.balanceOf(TEST_WALLET);
        console.log(`✅ Success! Transaction hash: ${tx.hash}`);
        console.log(`📊 Test Wallet TRIO Balance: ${ethers.formatUnits(newBalance, decimals)} TRIO`);

        // Stop impersonating
        await hre.network.provider.request({
          method: "hardhat_stopImpersonatingAccount",
          params: [whaleAddress],
        });

        whaleFound = true;
        break;
      }
    } catch (error) {
      console.log(`  ⚠️  Error checking ${whaleAddress}: ${error.message}`);
    }
  }

  if (!whaleFound) {
    console.log('\n❌ Could not find a whale with sufficient TRIO balance.');
    console.log('Trying to mint from TRIO contract directly...');
    
    // Try to impersonate the TRIO contract itself
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [TRIO_ADDRESS],
    });

    // Fund the contract with ETH for gas
    const [funder] = await ethers.getSigners();
    await funder.sendTransaction({
      to: TRIO_ADDRESS,
      value: ethers.parseEther('1.0')
    });

    const contractSigner = await ethers.getSigner(TRIO_ADDRESS);
    const trioWithSigner = new ethers.Contract(TRIO_ADDRESS, ERC20_ABI, contractSigner);
    
    const amountToSend = ethers.parseUnits('999', decimals);
    console.log(`\n📤 Transferring 999 TRIO from contract...`);
    
    try {
      const tx = await trioWithSigner.transfer(TEST_WALLET, amountToSend);
      await tx.wait();
      
      const newBalance = await trio.balanceOf(TEST_WALLET);
      console.log(`✅ Success! Transaction hash: ${tx.hash}`);
      console.log(`📊 Test Wallet TRIO Balance: ${ethers.formatUnits(newBalance, decimals)} TRIO`);
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }

    await hre.network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [TRIO_ADDRESS],
    });
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Minting complete!\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

