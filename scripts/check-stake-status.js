/**
 * Check Stake Status Script
 * 
 * This script checks the HEX stake status for a perpetual pool
 */

const hre = require("hardhat");

const HEX_CONTRACT_ADDRESS = '0x2b591e99afe9f32eaa6214f7b7629768c40eeb39';
const TRIO_POOL_ADDRESS = '0xF55cD1e399e1cc3D95303048897a680be3313308';

async function checkStakeStatus() {
  console.log('\n📊 Checking Stake Status');
  console.log('========================');
  
  try {
    const HEX_ABI = [
      'function stakeCount(address) view returns (uint256)',
      'function stakeLists(address, uint256) view returns (uint40 stakeId, uint72 stakedHearts, uint72 stakeShares, uint16 lockedDay, uint16 stakedDays, uint16 unlockedDay, bool isAutoStake)',
      'function currentDay() view returns (uint256)',
    ];
    
    const hexContract = await hre.ethers.getContractAt(HEX_ABI, HEX_CONTRACT_ADDRESS);
    
    // Get stake count for the pool
    const stakeCount = await hexContract.stakeCount(TRIO_POOL_ADDRESS);
    console.log(`\nStake Count for pool: ${stakeCount}`);
    
    // Get current HEX day
    const currentDay = await hexContract.currentDay();
    console.log(`Current HEX Day: ${currentDay}`);
    
    // Get stake info at index 0
    if (Number(stakeCount) > 0) {
      const stakeInfo = await hexContract.stakeLists(TRIO_POOL_ADDRESS, 0);
      
      console.log(`\n📋 Stake at Index 0:`);
      console.log(`   Stake ID: ${stakeInfo[0]}`);
      console.log(`   Staked Hearts: ${hre.ethers.formatUnits(stakeInfo[1], 8)} HEX`);
      console.log(`   Stake Shares: ${stakeInfo[2]}`);
      console.log(`   Locked Day: ${stakeInfo[3]}`);
      console.log(`   Staked Days: ${stakeInfo[4]}`);
      console.log(`   Unlocked Day: ${stakeInfo[5]}`);
      console.log(`   Is Auto Stake: ${stakeInfo[6]}`);
      
      // Check if stake has been ended
      if (Number(stakeInfo[5]) > 0) {
        console.log(`\n⚠️  STAKE HAS ALREADY BEEN ENDED!`);
        console.log(`   Unlocked on day: ${stakeInfo[5]}`);
      } else {
        // Calculate expected end day
        const expectedEndDay = Number(stakeInfo[3]) + Number(stakeInfo[4]);
        console.log(`\n   Expected End Day: ${expectedEndDay}`);
        
        if (Number(currentDay) >= expectedEndDay) {
          console.log(`   ✅ Stake is matured and ready to be ended`);
        } else {
          const daysRemaining = expectedEndDay - Number(currentDay);
          console.log(`   ⏳ Stake still active, ${daysRemaining} days remaining`);
        }
      }
    } else {
      console.log('\n❌ No stakes found for this pool address');
    }
    
  } catch (error) {
    console.error('❌ Error checking stake status:', error.message);
    throw error;
  }
}

// Main execution
async function main() {
  await checkStakeStatus();
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { checkStakeStatus };

