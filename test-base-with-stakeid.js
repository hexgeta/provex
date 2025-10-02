const { createPublicClient, http, parseAbi } = require('viem');
const { pulsechain } = require('viem/chains');

const BASE_CONTRACT = '0xe9f84d418b008888a992ff8c6d22389c2c3504e0';
const HEX_CONTRACT = '0x2b591e99afe9f32eaa6214f7b7629768c40eeb39';

const POOL_ABI = parseAbi([
  'function getEndStaker() view returns (address)',
  'function stakeCount(address) view returns (uint256)',
]);

const HEX_ABI = parseAbi([
  'function stakeCount(address) view returns (uint256)',
  'function stakeLists(address, uint256) view returns (uint40 stakeId, uint72 stakedHearts, uint72 stakeShares, uint16 lockedDay, uint16 stakedDays, uint16 unlockedDay, bool isAutoStake)',
  'event StakeEnd(uint256 data0, uint256 data1, address indexed stakerAddr, uint40 indexed stakeId)',
]);

async function testBaseContract() {
  const client = createPublicClient({
    chain: pulsechain,
    transport: http(),
  });

  console.log('=== QUERYING BASE CONTRACT ===\n');
  
  // Get the endStaker
  const endStaker = await client.readContract({
    address: BASE_CONTRACT,
    abi: POOL_ABI,
    functionName: 'getEndStaker',
  });

  console.log('End Staker:', endStaker);

  if (endStaker !== '0x0000000000000000000000000000000000000000') {
    console.log('\nStake has been ended. Getting stake info...\n');
    
    // Get stake count for BASE contract
    const stakeCount = await client.readContract({
      address: HEX_CONTRACT,
      abi: HEX_ABI,
      functionName: 'stakeCount',
      args: [BASE_CONTRACT],
    });

    console.log('Stake Count:', stakeCount.toString());

    if (stakeCount > 0n) {
      // Get the first stake info (index 0)
      const stakeInfo = await client.readContract({
        address: HEX_CONTRACT,
        abi: HEX_ABI,
        functionName: 'stakeLists',
        args: [BASE_CONTRACT, 0n],
      });

      const [stakeId, stakedHearts, stakeShares, lockedDay, stakedDays, unlockedDay, isAutoStake] = stakeInfo;
      
      console.log('Stake Info:');
      console.log('  Stake ID:', stakeId.toString());
      console.log('  Staked Hearts:', stakedHearts.toString());
      console.log('  Stake Shares:', stakeShares.toString());
      console.log('  Locked Day:', lockedDay.toString());
      console.log('  Staked Days:', stakedDays.toString());
      console.log('  Unlocked Day:', unlockedDay.toString());
      console.log('  Is Auto Stake:', isAutoStake);

      console.log('\n=== SEARCHING FOR STAKEEND TRANSACTION ===\n');
      
      const currentBlock = await client.getBlockNumber();
      const fromBlock = currentBlock - 500000n > 0n ? currentBlock - 500000n : 0n;
      
      console.log(`Searching blocks ${fromBlock} to ${currentBlock}`);
      console.log(`Filtering by stakerAddr: ${BASE_CONTRACT}`);
      console.log(`Filtering by stakeId: ${stakeId}\n`);
      
      const logs = await client.getLogs({
        address: HEX_CONTRACT,
        event: HEX_ABI[2], // StakeEnd event
        args: {
          stakerAddr: BASE_CONTRACT,
          stakeId: stakeId,
        },
        fromBlock,
        toBlock: 'latest',
      });

      console.log(`Found ${logs.length} StakeEnd events\n`);
      
      if (logs.length > 0) {
        const log = logs[0];
        console.log('✅ StakeEnd Transaction Found!');
        console.log('Transaction Hash:', log.transactionHash);
        console.log('Block Number:', log.blockNumber.toString());
        console.log('\nLinks:');
        console.log(`End Staker: https://otter.pulsechain.com/address/${endStaker}`);
        console.log(`Transaction: https://otter.pulsechain.com/tx/${log.transactionHash}`);
      } else {
        console.log('❌ No StakeEnd event found in the last 500,000 blocks.');
        console.log('The stake might have been ended earlier, or outside the search range.');
      }
    }
  } else {
    console.log('Stake has not been ended yet (endStaker is zero address)');
  }
}

testBaseContract().catch(console.error);

