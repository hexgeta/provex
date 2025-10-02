const { createPublicClient, http, parseAbi } = require('viem');
const { pulsechain } = require('viem/chains');

const BASE_CONTRACT = '0xe9f84d418b008888a992ff8c6d22389c2c3504e0';
const HEX_CONTRACT = '0x2b591e99afe9f32eaa6214f7b7629768c40eeb39';

const POOL_ABI = parseAbi([
  'function STAKE_IS_ACTIVE() view returns (bool)',
  'function getEndStaker() view returns (address)',
]);

const HEX_ABI = parseAbi([
  'function stakeLists(address, uint256) view returns (uint40 stakeId, uint72 stakedHearts, uint72 stakeShares, uint16 lockedDay, uint16 stakedDays, uint16 unlockedDay, bool isAutoStake)',
  'event StakeEnd(uint256 data0, uint256 data1, address indexed stakerAddr, uint40 indexed stakeId)',
]);

async function debugStakeEnd() {
  const client = createPublicClient({
    chain: pulsechain,
    transport: http(),
  });

  console.log('=== DEBUGGING STAKEEND EVENT ===\n');
  
  // Check if stake is active
  const isActive = await client.readContract({
    address: BASE_CONTRACT,
    abi: POOL_ABI,
    functionName: 'STAKE_IS_ACTIVE',
  });

  console.log('Stake Is Active:', isActive);

  // Get endStaker
  const endStaker = await client.readContract({
    address: BASE_CONTRACT,
    abi: POOL_ABI,
    functionName: 'getEndStaker',
  });

  console.log('End Staker:', endStaker);
  console.log('End Staker is set:', endStaker !== '0x0000000000000000000000000000000000000000');

  // Get stake info
  const stakeInfo = await client.readContract({
    address: HEX_CONTRACT,
    abi: HEX_ABI,
    functionName: 'stakeLists',
    args: [BASE_CONTRACT, 0n],
  });

  const [stakeId, stakedHearts, stakeShares, lockedDay, stakedDays, unlockedDay, isAutoStake] = stakeInfo;
  
  console.log('\nStake Info:');
  console.log('  Stake ID:', stakeId.toString());
  console.log('  Unlocked Day:', unlockedDay.toString(), '(0 means not ended yet)');

  if (unlockedDay === 0) {
    console.log('\n❗ The stake shows unlockedDay = 0, which means it has NOT been ended in HEX yet!');
    console.log('The endStaker is set in the pool contract, but the actual HEX stake is still active.');
    console.log('This explains why there is no StakeEnd event.');
  } else {
    console.log('\nThe stake HAS been ended. Searching for StakeEnd event with just stakeId filter...');
    
    const currentBlock = await client.getBlockNumber();
    const fromBlock = currentBlock - 1000000n > 0n ? currentBlock - 1000000n : 0n;
    
    const logs = await client.getLogs({
      address: HEX_CONTRACT,
      event: HEX_ABI[1],
      args: {
        stakeId: stakeId,
      },
      fromBlock,
      toBlock: 'latest',
    });

    console.log(`Found ${logs.length} StakeEnd events for stakeId ${stakeId}`);
    
    if (logs.length > 0) {
      console.log('\nEvent details:');
      logs.forEach((log, i) => {
        console.log(`  ${i + 1}. TX: ${log.transactionHash}, Block: ${log.blockNumber}`);
      });
    }
  }
}

debugStakeEnd().catch(console.error);

