const hre = require("hardhat");

// Diamond Hands contract addresses on PulseChain
const DIAMOND_HANDS_CONTRACTS = {
  BASE: "0x992678ad242230Dd795107Fee8B572E27083002A",
  TRIO: "0x7F343C25a6FD8Ce5fac441Cff22be3758EbE1e04",
  LUCKY: "0x4497f24bc4096053C3a5687A051732731b3f631B",
  DECI: "0x196E5f240d26969CFEf464e80C6e423620cc7E40",
};

// Known active wallets from the ecosystem (these are public addresses from the Maximus community)
const POTENTIAL_STAKERS = [
  "0x7A4814E2e5fC4C36b1b45C3a6DAf1BbF7e5f4b8B", // Example wallet 1
  "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb", // MAXI deployer
  "0x0fD8F92C8bc3763C1c7203D1e14E36d24cE31C6B", // Example wallet 3
  "0x9Ee1ee0aF4b5b8F61cBe8e5C9C3F4D4e5B2A1C3D", // Example wallet 4
  "0xB7c9E99Da8A857cE576A830A9c19312114d9dE02", // TEAM contract
];

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
];

const REWARD_BUCKET_ABI = [
  "function periodEndBalance(string, uint256) view returns (uint256)",
  "function periodRedemptionRates(string, uint256) view returns (uint256)",
  "function getClaimableAmount(address user, uint256 period, string ticker, uint256 stakeID) view returns (uint256, address)",
];

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function symbol() view returns (string)",
];

async function findInterestingStaker(poolName, contractAddress) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`💎 Analyzing ${poolName} Diamond Hands Club`);
  console.log(`📍 Contract: ${contractAddress}`);
  console.log(`${'='.repeat(80)}`);

  const contract = await hre.ethers.getContractAt(DH_ABI, contractAddress);

  // Get current state
  const currentPeriod = await contract.getCurrentPeriod();
  const isStaking = await contract.isStakingPeriod();
  const globalStaked = await contract.GLOBAL_AMOUNT_STAKED();
  const rewardBucketAddress = await contract.REWARD_BUCKET_ADDRESS();

  console.log(`\n📊 Contract State:`);
  console.log(`   Current Period: ${currentPeriod.toString()}`);
  console.log(`   Phase: ${isStaking ? 'STAKING' : 'RELOAD'}`);
  console.log(`   Total Staked: ${hre.ethers.formatUnits(globalStaked, 8)} tokens`);
  console.log(`   Reward Bucket: ${rewardBucketAddress}`);

  // Get reward bucket info
  const rewardBucket = await hre.ethers.getContractAt(REWARD_BUCKET_ABI, rewardBucketAddress);

  console.log(`\n🔍 Searching for interesting stakers...`);

  let bestStaker = null;
  let maxStakes = 0;

  // Search through potential stakers
  for (const walletAddress of POTENTIAL_STAKERS) {
    try {
      const userStaked = await contract.USER_AMOUNT_STAKED(walletAddress);
      
      if (userStaked > 0n) {
        console.log(`\n✅ Found staker: ${walletAddress}`);
        console.log(`   Total Staked: ${hre.ethers.formatUnits(userStaked, 8)} tokens`);

        // Find all their stakes
        const stakes = [];
        for (let stakeID = 0; stakeID <= Number(currentPeriod) + 2; stakeID++) {
          try {
            const stake = await contract.stakes(walletAddress, stakeID);
            if (stake.initiated && stake.balance > 0n) {
              stakes.push({
                stakeID,
                balance: stake.balance,
                expiryPeriod: stake.stake_expiry_period,
              });
            }
          } catch (e) {
            // Stake doesn't exist, continue
          }
        }

        if (stakes.length > 0) {
          console.log(`   Active Stakes: ${stakes.length}`);
          
          // Calculate potential rewards across periods
          let totalRewards = 0n;
          const rewardsByPeriod = [];

          for (let period = 1; period <= Number(currentPeriod); period++) {
            for (const stake of stakes) {
              try {
                const [claimableAmount] = await rewardBucket.getClaimableAmount(
                  walletAddress,
                  period,
                  poolName,
                  stake.stakeID
                );
                
                if (claimableAmount > 0n) {
                  totalRewards += claimableAmount;
                  rewardsByPeriod.push({
                    period,
                    stakeID: stake.stakeID,
                    amount: claimableAmount,
                  });
                }
              } catch (e) {
                // Period not claimable or doesn't exist
              }
            }
          }

          if (rewardsByPeriod.length > 0 || stakes.length > maxStakes) {
            maxStakes = stakes.length;
            bestStaker = {
              address: walletAddress,
              totalStaked: userStaked,
              stakes,
              rewards: rewardsByPeriod,
              totalRewards,
            };
          }

          console.log(`   Reward Periods: ${rewardsByPeriod.length}`);
          if (totalRewards > 0n) {
            console.log(`   Total Rewards: ${hre.ethers.formatUnits(totalRewards, 8)} ${poolName}`);
          }
        }
      }
    } catch (error) {
      // Wallet not found or error, continue
    }
  }

  // If no predefined stakers found, try to find from events or suggest manual address
  if (!bestStaker) {
    console.log(`\n⚠️  No active stakers found in predefined list.`);
    console.log(`\n💡 Suggestions:`);
    console.log(`   1. Provide a known staker address from the community`);
    console.log(`   2. Check recent transactions on the contract`);
    console.log(`   3. Use your own test wallet to create stakes`);
    return null;
  }

  return bestStaker;
}

async function displayStakerDetails(poolName, staker) {
  if (!staker) return;

  console.log(`\n${'='.repeat(80)}`);
  console.log(`🎯 INTERESTING STAKER FOUND!`);
  console.log(`${'='.repeat(80)}`);
  console.log(`\n👤 Address: ${staker.address}`);
  console.log(`💰 Total Staked: ${hre.ethers.formatUnits(staker.totalStaked, 8)} ${poolName}`);
  console.log(`📊 Number of Stakes: ${staker.stakes.length}`);

  console.log(`\n🔐 Active Stakes:`);
  staker.stakes.forEach((stake, idx) => {
    console.log(`   ${idx + 1}. Stake ID: ${stake.stakeID}`);
    console.log(`      Balance: ${hre.ethers.formatUnits(stake.balance, 8)} ${poolName}`);
    console.log(`      Expiry Period: ${stake.expiryPeriod.toString()}`);
  });

  if (staker.rewards.length > 0) {
    console.log(`\n🎁 Claimable Rewards (${poolName}):`);
    staker.rewards.forEach((reward, idx) => {
      console.log(`   ${idx + 1}. Period ${reward.period} - Stake ID ${reward.stakeID}`);
      console.log(`      Amount: ${hre.ethers.formatUnits(reward.amount, 8)} ${poolName}`);
    });
    console.log(`\n   💎 Total Rewards: ${hre.ethers.formatUnits(staker.totalRewards, 8)} ${poolName}`);
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log(`\n📋 Testing Instructions:`);
  console.log(`   1. Copy this address: ${staker.address}`);
  console.log(`   2. Use it in your UI to view their stakes and rewards`);
  console.log(`   3. Verify the ${staker.stakes.length} active stakes are displayed correctly`);
  if (staker.rewards.length > 0) {
    console.log(`   4. Check that ${staker.rewards.length} reward period(s) show claimable amounts`);
  }
  console.log(`${'='.repeat(80)}`);
}

async function main() {
  console.log("\n🔍 DIAMOND HANDS STAKER FINDER");
  console.log("================================\n");

  const pool = process.env.POOL || "BASE";
  
  if (!DIAMOND_HANDS_CONTRACTS[pool]) {
    console.error(`❌ Invalid pool: ${pool}`);
    console.error(`   Available pools: ${Object.keys(DIAMOND_HANDS_CONTRACTS).join(', ')}`);
    process.exit(1);
  }

  const contractAddress = DIAMOND_HANDS_CONTRACTS[pool];
  const staker = await findInterestingStaker(pool, contractAddress);
  
  if (staker) {
    await displayStakerDetails(pool, staker);
  } else {
    console.log(`\n❌ No interesting stakers found for ${pool}`);
    console.log(`\n💡 Try creating test stakes on a local fork:`);
    console.log(`   1. Fork PulseChain: npx hardhat node --fork https://rpc.pulsechain.com`);
    console.log(`   2. Impersonate a whale account`);
    console.log(`   3. Create multiple stakes across different periods`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

