const hre = require("hardhat");

// Diamond Hands contract addresses on PulseChain
const DIAMOND_HANDS_CONTRACTS = {
  BASE: "0x992678ad242230Dd795107Fee8B572E27083002A",
  TRIO: "0x7F343C25a6FD8Ce5fac441Cff22be3758EbE1e04",
  LUCKY: "0x4497f24bc4096053C3a5687A051732731b3f631B",
  DECI: "0x196E5f240d26969CFEf464e80C6e423620cc7E40",
};

const DH_ABI = [
  "function USER_AMOUNT_STAKED(address) view returns (uint256)",
  "function GLOBAL_AMOUNT_STAKED() view returns (uint256)",
  "function getCurrentPeriod() view returns (uint256)",
  "function getglobalStakedTokensPerPeriod(uint256 period) view returns (uint256)",
  "function getAddressPeriodEndTotal(address staker, uint256 period, uint256 stakeID) view returns (uint256)",
  "function stakes(address, uint256) view returns (address staker, uint256 balance, uint256 stakeID, uint256 stake_expiry_period, bool initiated)",
  "function isStakingPeriod() view returns (bool)",
  "function REWARD_BUCKET_ADDRESS() view returns (address)",
  "function STAKE_REWARD_DISTRIBUTION_ADDRESS() view returns (address)",
  "event Stake(address indexed staker, uint256 amount, uint256 current_period, uint256 stakeID, bool is_initial)",
];

const REWARD_BUCKET_ABI = [
  "function periodEndBalance(string, uint256) view returns (uint256)",
  "function periodRedemptionRates(string, uint256) view returns (uint256)",
  "function getClaimableAmount(address user, uint256 period, string ticker, uint256 stakeID) view returns (uint256, address)",
  "function getSupportedTokens(string) view returns (address)",
];

async function analyzeAddress(poolName, contractAddress, stakerAddress) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`💎 Diamond Hands Analysis for ${poolName}`);
  console.log(`📍 Contract: ${contractAddress}`);
  console.log(`👤 Staker: ${stakerAddress}`);
  console.log(`${'='.repeat(80)}`);

  const contract = await hre.ethers.getContractAt(DH_ABI, contractAddress);

  // Get current state
  const currentPeriod = await contract.getCurrentPeriod();
  const isStaking = await contract.isStakingPeriod();
  const globalStaked = await contract.GLOBAL_AMOUNT_STAKED();
  const rewardBucketAddress = await contract.REWARD_BUCKET_ADDRESS();
  const stakeRewardDistAddress = await contract.STAKE_REWARD_DISTRIBUTION_ADDRESS();

  console.log(`\n📊 Contract State:`);
  console.log(`   Current Period: ${currentPeriod.toString()}`);
  console.log(`   Phase: ${isStaking ? 'STAKING 🔒' : 'RELOAD 🔄'}`);
  console.log(`   Global Staked: ${hre.ethers.formatUnits(globalStaked, 8)} ${poolName}`);

  // Get user's total staked amount
  const userStaked = await contract.USER_AMOUNT_STAKED(stakerAddress);
  
  if (userStaked === 0n) {
    console.log(`\n❌ This address has no active stakes in ${poolName} Diamond Hands`);
    return null;
  }

  console.log(`\n👤 User Stats:`);
  console.log(`   Total Staked: ${hre.ethers.formatUnits(userStaked, 8)} ${poolName}`);
  console.log(`   Share of Pool: ${(Number(userStaked) / Number(globalStaked) * 100).toFixed(4)}%`);

  // Find all active stakes
  console.log(`\n🔍 Scanning for active stakes...`);
  const stakes = [];
  
  for (let stakeID = 0; stakeID <= Number(currentPeriod) + 5; stakeID++) {
    try {
      const stake = await contract.stakes(stakerAddress, stakeID);
      if (stake.initiated && stake.balance > 0n) {
        stakes.push({
          stakeID,
          balance: stake.balance,
          expiryPeriod: stake.stake_expiry_period,
        });
      }
    } catch (e) {
      // Stake doesn't exist
    }
  }

  if (stakes.length === 0) {
    console.log(`   ⚠️  No active stakes found (staked amount may be in expired stakes)`);
    return null;
  }

  console.log(`\n🔐 Active Stakes (${stakes.length} total):`);
  stakes.forEach((stake, idx) => {
    const status = Number(stake.expiryPeriod) < Number(currentPeriod) ? '✅ EXPIRED' :
                   Number(stake.expiryPeriod) === Number(currentPeriod) ? '🔄 EXPIRING' : '🔒 LOCKED';
    console.log(`\n   ${idx + 1}. Stake ID: ${stake.stakeID} ${status}`);
    console.log(`      Balance: ${hre.ethers.formatUnits(stake.balance, 8)} ${poolName}`);
    console.log(`      Expiry Period: ${stake.expiryPeriod.toString()}`);
    
    if (Number(stake.expiryPeriod) >= Number(currentPeriod)) {
      const periodsRemaining = Number(stake.expiryPeriod) - Number(currentPeriod);
      console.log(`      Periods Remaining: ${periodsRemaining}`);
    }
  });

  // Check for rewards across all periods and stakes
  const rewardBucket = await hre.ethers.getContractAt(REWARD_BUCKET_ABI, rewardBucketAddress);
  
  console.log(`\n🎁 Checking Rewards...`);
  
  const rewardsByToken = new Map();
  const supportedTokens = ['BASE', 'TRIO', 'LUCKY', 'DECI', 'HEX', 'MAXI', 'HDRN', 'TEAM', 'ICSA'];
  
  for (const token of supportedTokens) {
    const tokenRewards = [];
    let totalForToken = 0n;

    // Check historical periods (only completed periods)
    const lastCompletedPeriod = isStaking ? Number(currentPeriod) - 2 : Number(currentPeriod) - 1;
    
    for (let period = 1; period <= lastCompletedPeriod; period += 2) { // Only odd periods (staking periods)
      for (const stake of stakes) {
        try {
          const [claimableAmount, tokenAddress] = await rewardBucket.getClaimableAmount(
            stakerAddress,
            period,
            token,
            stake.stakeID
          );
          
          if (claimableAmount > 0n) {
            totalForToken += claimableAmount;
            tokenRewards.push({
              period,
              stakeID: stake.stakeID,
              amount: claimableAmount,
            });
          }
        } catch (e) {
          // Not claimable or doesn't exist
        }
      }
    }

    if (totalForToken > 0n) {
      rewardsByToken.set(token, {
        total: totalForToken,
        details: tokenRewards,
      });
    }
  }

  if (rewardsByToken.size > 0) {
    console.log(`\n   Found rewards in ${rewardsByToken.size} token(s)! 🎉\n`);
    
    for (const [token, data] of rewardsByToken.entries()) {
      console.log(`   💰 ${token}:`);
      console.log(`      Total Claimable: ${hre.ethers.formatUnits(data.total, 8)} ${token}`);
      console.log(`      Reward Periods: ${data.details.length}`);
      
      data.details.forEach((reward, idx) => {
        console.log(`         ${idx + 1}. Period ${reward.period}, Stake ${reward.stakeID}: ${hre.ethers.formatUnits(reward.amount, 8)} ${token}`);
      });
      console.log(``);
    }
  } else {
    console.log(`   ℹ️  No claimable rewards found yet`);
    console.log(`   💡 Rewards are distributed after each staking period ends`);
  }

  // Calculate potential for current period
  if (stakes.some(s => Number(s.expiryPeriod) >= Number(currentPeriod))) {
    console.log(`\n📈 Future Rewards:`);
    console.log(`   Stakes are currently locked and will earn rewards from:`);
    stakes.forEach((stake, idx) => {
      if (Number(stake.expiryPeriod) >= Number(currentPeriod)) {
        console.log(`      • Stake ${stake.stakeID}: Will earn from period ${currentPeriod.toString()} rewards`);
      }
    });
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log(`\n✅ TESTING ADDRESS FOUND!`);
  console.log(`\n📋 Summary:`);
  console.log(`   Address: ${stakerAddress}`);
  console.log(`   Pool: ${poolName}`);
  console.log(`   Total Staked: ${hre.ethers.formatUnits(userStaked, 8)} ${poolName}`);
  console.log(`   Active Stakes: ${stakes.length}`);
  console.log(`   Reward Tokens: ${rewardsByToken.size}`);
  console.log(`\n💡 Use this address in your UI to test:`);
  console.log(`   1. Viewing multiple stakes`);
  console.log(`   2. Displaying rewards across different tokens`);
  console.log(`   3. Testing claim functionality`);
  console.log(`${'='.repeat(80)}\n`);

  return {
    address: stakerAddress,
    pool: poolName,
    totalStaked: userStaked,
    stakes,
    rewards: rewardsByToken,
  };
}

async function main() {
  console.log("\n💎 DIAMOND HANDS ADDRESS CHECKER");
  console.log("=================================\n");

  const address = process.env.ADDRESS;
  const pool = process.env.POOL || "BASE";

  if (!address) {
    console.error("❌ Please provide an address:");
    console.error("   ADDRESS=0x... POOL=BASE npx hardhat run scripts/check-dh-address.js --network pulsechain\n");
    
    console.log("💡 Suggested addresses to try (known Diamond Hands participants):");
    console.log("   1. Check https://scan.pulsechain.com for recent transactions");
    console.log("   2. Look for 'Stake' events on the Diamond Hands contracts");
    console.log("   3. Use a block explorer to find users who called 'joinClub'\n");
    
    console.log("📍 Diamond Hands Contracts:");
    Object.entries(DIAMOND_HANDS_CONTRACTS).forEach(([name, addr]) => {
      console.log(`   ${name}: ${addr}`);
    });
    
    process.exit(1);
  }

  if (!DIAMOND_HANDS_CONTRACTS[pool]) {
    console.error(`❌ Invalid pool: ${pool}`);
    console.error(`   Available: ${Object.keys(DIAMOND_HANDS_CONTRACTS).join(', ')}`);
    process.exit(1);
  }

  const contractAddress = DIAMOND_HANDS_CONTRACTS[pool];
  await analyzeAddress(pool, contractAddress, address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

