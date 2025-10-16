/**
 * Check End Staker Script
 * 
 * This script checks who the designated END_STAKER is for the pool
 */

const hre = require("hardhat");

const TRIO_POOL_ADDRESS = '0xF55cD1e399e1cc3D95303048897a680be3313308';

async function checkEndStaker() {
  console.log('\n🔍 Checking END_STAKER');
  console.log('========================');
  
  try {
    const POOL_ABI = [
      'function getEndStaker() view returns (address)',
      'function END_STAKER() view returns (address)',
    ];
    
    const poolContract = await hre.ethers.getContractAt(POOL_ABI, TRIO_POOL_ADDRESS);
    
    // Try getEndStaker() first
    try {
      const endStaker = await poolContract.getEndStaker();
      console.log(`\nEND_STAKER address: ${endStaker}`);
      
      // Check if it's the null address (anyone can end)
      if (endStaker === '0x0000000000000000000000000000000000000000') {
        console.log('✅ Anyone can end the stake (END_STAKER is null address)');
      } else {
        console.log('⚠️  Only the designated END_STAKER can end this stake');
      }
      
      // Get connected wallet address
      const [signer] = await hre.ethers.getSigners();
      const signerAddress = await signer.getAddress();
      console.log(`\nYour wallet address: ${signerAddress}`);
      
      if (endStaker.toLowerCase() === signerAddress.toLowerCase()) {
        console.log('✅ You are the END_STAKER!');
      } else {
        console.log('❌ You are NOT the END_STAKER');
        console.log('\nTo end the stake, you need to either:');
        console.log('1. Use the END_STAKER wallet, or');
        console.log('2. Impersonate the END_STAKER account');
      }
      
    } catch (error) {
      console.log('Error getting END_STAKER:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

// Main execution
async function main() {
  await checkEndStaker();
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { checkEndStaker };





