const hre = require("hardhat");

// Diamond Hands contract addresses on PulseChain  
const DIAMOND_HANDS_CONTRACTS = {
  BASE: "0x992678ad242230Dd795107Fee8B572E27083002A",
  TRIO: "0x7F343C25a6FD8Ce5fac441Cff22be3758EbE1e04",
  LUCKY: "0x4497f24bc4096053C3a5687A051732731b3f631B",
  DECI: "0x196E5f240d26969CFEf464e80C6e423620cc7E40",
};

const DH_ABI = [
  "event Stake(address indexed staker, uint256 amount, uint256 current_period, uint256 stakeID, bool is_initial)",
  "function USER_AMOUNT_STAKED(address) view returns (uint256)",
  "function getCurrentPeriod() view returns (uint256)",
];

async function scanForStakers(poolName, contractAddress) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`💎 Scanning ${poolName} Diamond Hands for Active Stakers`);
  console.log(`📍 Contract: ${contractAddress}`);
  console.log(`${'='.repeat(80)}\n`);

  const contract = await hre.ethers.getContractAt(DH_ABI, contractAddress);
  const currentPeriod = await contract.getCurrentPeriod();

  console.log(`📊 Current Period: ${currentPeriod.toString()}\n`);
  console.log(`🔍 Scanning recent Stake events...`);

  try {
    // Get current block
    const currentBlock = await hre.ethers.provider.getBlockNumber();
    const blocksToScan = 100000; // Scan last ~100k blocks
    const fromBlock = Math.max(0, currentBlock - blocksToScan);

    console.log(`   Scanning blocks ${fromBlock} to ${currentBlock}...`);
    console.log(`   (This may take a minute...)\n`);

    // Query Stake events
    const filter = contract.filters.Stake();
    const events = await contract.queryFilter(filter, fromBlock, currentBlock);

    console.log(`   Found ${events.length} Stake events in recent history\n`);

    if (events.length === 0) {
      console.log(`⚠️  No recent stakes found. Try scanning more blocks or earlier periods.`);
      return [];
    }

    // Collect unique stakers
    const stakers = new Set();
    events.forEach(event => {
      stakers.add(event.args.staker);
    });

    console.log(`   Unique stakers: ${stakers.size}\n`);
    console.log(`${'='.repeat(80)}`);
    console.log(`\n🎯 Top Stakers:\n`);

    // Check current balance for each staker
    const stakerBalances = [];
    
    for (const stakerAddress of stakers) {
      try {
        const balance = await contract.USER_AMOUNT_STAKED(stakerAddress);
        if (balance > 0n) {
          stakerBalances.push({
            address: stakerAddress,
            balance,
          });
        }
      } catch (e) {
        // Skip if error
      }
    }

    // Sort by balance descending
    stakerBalances.sort((a, b) => {
      if (a.balance > b.balance) return -1;
      if (a.balance < b.balance) return 1;
      return 0;
    });

    // Display top 10 stakers
    const topStakers = stakerBalances.slice(0, 10);
    
    if (topStakers.length === 0) {
      console.log(`   ⚠️  No stakers with active balances found`);
      return [];
    }

    topStakers.forEach((staker, idx) => {
      console.log(`   ${idx + 1}. ${staker.address}`);
      console.log(`      Staked: ${hre.ethers.formatUnits(staker.balance, 8)} ${poolName}\n`);
    });

    console.log(`${'='.repeat(80)}`);
    console.log(`\n✅ Found ${topStakers.length} active staker(s)!`);
    console.log(`\n💡 To analyze any of these addresses in detail:`);
    console.log(`   ADDRESS=<address> POOL=${poolName} npx hardhat run scripts/check-dh-address.js --network pulsechain`);
    console.log(`\n📋 Quick check command for top staker:`);
    if (topStakers.length > 0) {
      console.log(`   ADDRESS=${topStakers[0].address} POOL=${poolName} npx hardhat run scripts/check-dh-address.js --network pulsechain`);
    }
    console.log(`${'='.repeat(80)}\n`);

    return topStakers;

  } catch (error) {
    console.error(`\n❌ Error scanning events: ${error.message}`);
    
    if (error.message.includes('exceed maximum block range')) {
      console.log(`\n💡 Try reducing the block range or use a different RPC provider`);
    }
    
    return [];
  }
}

async function main() {
  console.log("\n🔍 DIAMOND HANDS EVENT SCANNER");
  console.log("===============================");

  const pool = process.env.POOL || "BASE";

  if (!DIAMOND_HANDS_CONTRACTS[pool]) {
    console.error(`\n❌ Invalid pool: ${pool}`);
    console.error(`   Available: ${Object.keys(DIAMOND_HANDS_CONTRACTS).join(', ')}\n`);
    process.exit(1);
  }

  const contractAddress = DIAMOND_HANDS_CONTRACTS[pool];
  const stakers = await scanForStakers(pool, contractAddress);

  if (stakers.length === 0) {
    console.log(`\n💡 Alternative methods to find stakers:`);
    console.log(`   1. Check the contract on PulseScan: https://scan.pulsechain.com/address/${contractAddress}`);
    console.log(`   2. Look for 'joinClub' transactions`);
    console.log(`   3. Try a different pool: POOL=TRIO npx hardhat run scripts/scan-dh-events.js --network pulsechain\n`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

