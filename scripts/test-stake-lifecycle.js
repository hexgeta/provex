/**
 * Test Stake Lifecycle Script
 * 
 * This script helps test the complete stake lifecycle:
 * - Checks current stake status
 * - Fast forwards to stake end
 * - Tests end stake functionality
 * - Tests reward claims
 * 
 * Usage:
 * npx hardhat run scripts/test-stake-lifecycle.js --network localhost
 */

const hre = require("hardhat");
const { fastForwardTime, getCurrentTime, fastForwardToTimestamp } = require("./fast-forward-time");

// Contract addresses from your app config
const CONTRACTS = {
  ethereum: {
    HEX: "0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39",
    MAXI: "0x0d86EB9f43C57f6FF3BC9E23D8F9d82503f0e84b", // eMAXI
    TRIO: "0xF55cD1e399e1cc3D95303048897a680be3313308", // eTRIO
    BASE: "0xe9f84d418b008888a992ff8c6d22389c2c3504e0", // eBASE3 (Cycle 3)
    DECI: "0x6B32022693210cD2Cfc466b9Ac0085DE8fC34eA6", // eDECI
    LUCKY: "0x6b0956258ff7bd7645aa35369b55b61b8e6d6140", // eLUCKY
    TEAM: "0xb7c9e99da8a857ce576a830a9c19312114d9de02", // TEAM on Ethereum
  },
  pulsechain: {
    HEX: "0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39",
    MAXI: "0x0d86EB9f43C57f6FF3BC9E23D8F9d82503f0e84b",
    TRIO: "0xF55cD1e399e1cc3D95303048897a680be3313308",
    BASE: "0xe9f84d418b008888a992ff8c6d22389c2c3504e0", // BASE3 (Cycle 3)
    DECI: "0x6B32022693210cD2Cfc466b9Ac0085DE8fC34eA6",
    LUCKY: "0x6b0956258ff7bd7645aa35369b55b61b8e6d6140",
    TEAM: "0xb7c9e99da8a857ce576a830a9c19312114d9de02", // TEAM on PulseChain
  }
};

// Diamond Hands contract addresses
const DIAMOND_HANDS_CONTRACTS = {
  ethereum: {
    BASE: "0x992678ad242230Dd795107Fee8B572E27083002A",
    TRIO: "0x7F343C25a6FD8Ce5fac441Cff22be3758EbE1e04",
    LUCKY: "0x4497f24bc4096053C3a5687A051732731b3f631B",
    DECI: "0x196E5f240d26969CFEf464e80C6e423620cc7E40",
  },
  pulsechain: {
    BASE: "0x992678ad242230Dd795107Fee8B572E27083002A",
    TRIO: "0x7F343C25a6FD8Ce5fac441Cff22be3758EbE1e04",
    LUCKY: "0x4497f24bc4096053C3a5687A051732731b3f631B",
    DECI: "0x196E5f240d26969CFEf464e80C6e423620cc7E40",
  }
};

// HEX Day calculation (HEX launched Nov 19, 2019)
const HEX_LAUNCH_TIME = 1574099200; // Unix timestamp

function calculateHexDay(timestamp) {
  return Math.floor((timestamp - HEX_LAUNCH_TIME) / 86400);
}

async function getStakeInfo(contractAddress, stakeIndex = 0) {
  console.log(`\n📋 Getting stake info for contract: ${contractAddress}`);
  
  try {
    // Generic pool ABI (works for MAXI, TRIO, BASE, DECI)
    const poolABI = [
      "function stakeInfo() view returns (uint40 stakeId, uint72 stakedHearts, uint72 stakeShares, uint16 lockedDay, uint16 stakedDays, uint16 unlockedDay, bool isAutoStake)",
      "function currentHexDay() view returns (uint256)",
    ];
    
    const contract = await hre.ethers.getContractAt(poolABI, contractAddress);
    
    // Get current HEX day
    const currentHexDay = await contract.currentHexDay();
    console.log(`   Current HEX Day: ${currentHexDay.toString()}`);
    
    // Get stake info
    const stake = await contract.stakeInfo();
    const stakeId = stake[0];
    const stakedHearts = stake[1];
    const stakeShares = stake[2];
    const lockedDay = stake[3];
    const stakedDays = stake[4];
    const unlockedDay = stake[5];
    const isAutoStake = stake[6];
    
    const endDay = Number(lockedDay) + Number(stakedDays);
    const daysRemaining = endDay - Number(currentHexDay);
    
    console.log(`\n   Stake Details:`);
    console.log(`   - Stake ID: ${stakeId}`);
    console.log(`   - Staked Hearts: ${hre.ethers.formatUnits(stakedHearts, 8)} HEX`);
    console.log(`   - Stake Shares: ${stakeShares.toString()}`);
    console.log(`   - Locked Day: ${lockedDay}`);
    console.log(`   - Staked Days: ${stakedDays}`);
    console.log(`   - Unlocked Day: ${unlockedDay}`);
    console.log(`   - End Day: ${endDay}`);
    console.log(`   - Days Remaining: ${daysRemaining}`);
    console.log(`   - Is Auto-Stake: ${isAutoStake}`);
    
    const canEnd = daysRemaining <= 0;
    console.log(`\n   ${canEnd ? '✅ Stake can be ended!' : '⏳ Stake is still active'}`);
    
    return {
      currentHexDay: Number(currentHexDay),
      stakeId,
      lockedDay: Number(lockedDay),
      stakedDays: Number(stakedDays),
      endDay,
      daysRemaining,
      canEnd,
      unlockedDay: Number(unlockedDay),
      stakedHearts,
      stakeShares,
    };
  } catch (error) {
    console.error(`   ❌ Error getting stake info: ${error.message}`);
    return null;
  }
}

async function fastForwardToStakeEnd(stakeInfo) {
  if (stakeInfo.canEnd) {
    console.log("\n✅ Stake can already be ended!");
    return true;
  }
  
  console.log(`\n⏩ Fast forwarding ${stakeInfo.daysRemaining} days to stake end...`);
  
  // Add a few extra days to be safe
  const daysToForward = stakeInfo.daysRemaining + 2;
  await fastForwardTime(daysToForward);
  
  console.log("✅ Time advanced to after stake end!");
  return true;
}

async function testTeamStaking(contractAddress) {
  console.log(`\n🏆 Testing Team Staking Contract: ${contractAddress}`);
  
  try {
    const teamABI = [
      "function currentHexDay() view returns (uint256)",
      "function stakingPeriodEndDay() view returns (uint256)",
      "function rewardPeriodEndDay() view returns (uint256)",
      "function hasStakeEnded() view returns (bool)",
    ];
    
    const contract = await hre.ethers.getContractAt(teamABI, contractAddress);
    
    const currentHexDay = await contract.currentHexDay();
    const stakingPeriodEndDay = await contract.stakingPeriodEndDay();
    const rewardPeriodEndDay = await contract.rewardPeriodEndDay();
    const hasStakeEnded = await contract.hasStakeEnded();
    
    console.log(`\n   Team Staking Status:`);
    console.log(`   - Current HEX Day: ${currentHexDay.toString()}`);
    console.log(`   - Staking Period End Day: ${stakingPeriodEndDay.toString()}`);
    console.log(`   - Reward Period End Day: ${rewardPeriodEndDay.toString()}`);
    console.log(`   - Has Stake Ended: ${hasStakeEnded}`);
    
    const daysUntilRewardEnd = Number(rewardPeriodEndDay) - Number(currentHexDay);
    console.log(`   - Days Until Rewards Claimable: ${daysUntilRewardEnd}`);
    
    if (daysUntilRewardEnd > 0) {
      console.log(`\n⏩ Fast forwarding ${daysUntilRewardEnd + 1} days to reward period end...`);
      await fastForwardTime(daysUntilRewardEnd + 1);
      console.log("✅ Time advanced to reward claiming period!");
    } else {
      console.log("\n✅ Rewards are already claimable!");
    }
    
    return true;
  } catch (error) {
    console.error(`   ❌ Error testing Team staking: ${error.message}`);
    return false;
  }
}

async function testDiamondHands(contractAddress) {
  console.log(`\n💎 Testing Diamond Hands Contract: ${contractAddress}`);
  
  try {
    const dhABI = [
      "function currentHexDay() view returns (uint256)",
      "function lockPeriodDays() view returns (uint256)",
    ];
    
    const contract = await hre.ethers.getContractAt(dhABI, contractAddress);
    
    const currentHexDay = await contract.currentHexDay();
    const lockPeriodDays = await contract.lockPeriodDays();
    
    console.log(`\n   Diamond Hands Status:`);
    console.log(`   - Current HEX Day: ${currentHexDay.toString()}`);
    console.log(`   - Lock Period Days: ${lockPeriodDays.toString()}`);
    
    return true;
  } catch (error) {
    console.error(`   ❌ Error testing Diamond Hands: ${error.message}`);
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const network = hre.network.name;
  
  console.log("\n🧪 Stake Lifecycle Testing Tool");
  console.log("=================================");
  console.log(`Network: ${network}\n`);
  
  // Show current time
  const currentTime = await getCurrentTime();
  console.log(`📅 Current blockchain time:`);
  console.log(`   Block: ${currentTime.blockNumber}`);
  console.log(`   Timestamp: ${currentTime.timestamp}`);
  console.log(`   Date: ${currentTime.date}`);
  console.log(`   HEX Day: ${calculateHexDay(currentTime.timestamp)}`);
  
  // Determine which contracts to test based on network
  const chainContracts = network.includes('pulse') ? CONTRACTS.pulsechain : CONTRACTS.ethereum;
  
  // Test a specific pool or all pools
  const poolToTest = args[0]?.toUpperCase();
  
  if (poolToTest && chainContracts[poolToTest]) {
    console.log(`\n🎯 Testing ${poolToTest} pool...`);
    const stakeInfo = await getStakeInfo(chainContracts[poolToTest]);
    
    if (stakeInfo && !stakeInfo.canEnd) {
      const proceed = true; // In automated tests, auto-proceed
      if (proceed) {
        await fastForwardToStakeEnd(stakeInfo);
        // Check again after fast forward
        await getStakeInfo(chainContracts[poolToTest]);
      }
    }
  } else {
    // Test all pools
    console.log(`\n🎯 Testing all pools on ${network}...`);
    
    for (const [poolName, contractAddress] of Object.entries(chainContracts)) {
      console.log(`\n${'='.repeat(50)}`);
      console.log(`Testing ${poolName} Pool`);
      console.log('='.repeat(50));
      
      const stakeInfo = await getStakeInfo(contractAddress);
      
      if (stakeInfo && !stakeInfo.canEnd) {
        console.log(`\n⏩ Would you like to fast forward to stake end? (auto-yes in script mode)`);
        await fastForwardToStakeEnd(stakeInfo);
        // Check again after fast forward
        await getStakeInfo(contractAddress);
      }
      
      console.log("\n"); // Add spacing between pools
    }
  }
  
  // Test Team staking if requested
  if (args.includes('--team')) {
    console.log(`\n${'='.repeat(50)}`);
    const teamAddress = chainContracts.TEAM;
    if (teamAddress) {
      await testTeamStaking(teamAddress);
    } else {
      console.log("⚠️  Team contract address not configured for this network");
    }
  }
  
  // Test Diamond Hands if requested
  if (args.includes('--dh')) {
    console.log(`\n${'='.repeat(50)}`);
    console.log('Testing Diamond Hands Contracts');
    console.log('='.repeat(50));
    
    const dhContracts = network.includes('pulse') 
      ? DIAMOND_HANDS_CONTRACTS.pulsechain 
      : DIAMOND_HANDS_CONTRACTS.ethereum;
    
    for (const [poolName, dhAddress] of Object.entries(dhContracts)) {
      console.log(`\n💎 ${poolName} Diamond Hands: ${dhAddress}`);
      await testDiamondHands(dhAddress);
    }
  }
  
  console.log("\n✨ Testing complete!");
  console.log("\n💡 Next steps:");
  console.log("   1. Make sure your frontend is pointing to http://localhost:8545");
  console.log("   2. Connect your wallet to the local network");
  console.log("   3. Test the end stake functionality in your UI");
  console.log("   4. Test reward claiming");
  console.log("\n");
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = {
  getStakeInfo,
  fastForwardToStakeEnd,
  testTeamStaking,
  testDiamondHands,
  calculateHexDay,
};

