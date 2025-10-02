const { createPublicClient, http, parseAbi } = require('viem');
const { pulsechain } = require('viem/chains');

const BASE_CONTRACT = '0xe9f84d418b008888a992ff8c6d22389c2c3504e0';
const HEX_CONTRACT = '0x2b591e99afe9f32eaa6214f7b7629768c40eeb39';

const POOL_ABI = parseAbi([
  'function getEndStaker() view returns (address)',
]);

const HEX_ABI = parseAbi([
  'function stakeCount(address) view returns (uint256)',
  'function stakeLists(address, uint256) view returns (uint40 stakeId, uint72 stakedHearts, uint72 stakeShares, uint16 lockedDay, uint16 stakedDays, uint16 unlockedDay, bool isAutoStake)',
  'event StakeEnd(uint256 data0, uint256 data1, address indexed stakerAddr, uint40 indexed stakeId)',
]);

async function testEndStakerVerification() {
  const client = createPublicClient({
    chain: pulsechain,
    transport: http(),
  });

  console.log('=== TESTING ENDSTAKER VERIFICATION APPROACH ===\n');
  
  // Get the endStaker
  const endStaker = await client.readContract({
    address: BASE_CONTRACT,
    abi: POOL_ABI,
    functionName: 'getEndStaker',
  });

  console.log('End Staker:', endStaker);

  // Get stake info
  const stakeInfo = await client.readContract({
    address: HEX_CONTRACT,
    abi: HEX_ABI,
    functionName: 'stakeLists',
    args: [BASE_CONTRACT, 0n],
  });

  const stakeId = stakeInfo[0];
  console.log('Stake ID:', stakeId.toString());

  console.log('\n=== SEARCHING FROM BLOCK 0 ===\n');
  
  try {
    const logs = await client.getLogs({
      address: HEX_CONTRACT,
      event: HEX_ABI[2], // StakeEnd event
      args: {
        stakerAddr: BASE_CONTRACT,
        stakeId: stakeId,
      },
      fromBlock: 0n,
      toBlock: 'latest',
    });

    console.log(`Found ${logs.length} StakeEnd events\n`);
    
    if (logs.length > 0) {
      for (const log of logs) {
        console.log(`Checking transaction: ${log.transactionHash}`);
        const tx = await client.getTransaction({ hash: log.transactionHash });
        console.log(`Transaction from: ${tx.from}`);
        console.log(`Expected endStaker: ${endStaker}`);
        console.log(`Match: ${tx.from.toLowerCase() === endStaker.toLowerCase()}`);
        
        if (tx.from.toLowerCase() === endStaker.toLowerCase()) {
          console.log('\n✅ FOUND MATCHING TRANSACTION!');
          console.log('Transaction Hash:', log.transactionHash);
          console.log('Block Number:', log.blockNumber.toString());
          console.log(`\nhttps://otter.pulsechain.com/tx/${log.transactionHash}`);
          break;
        }
      }
    }
  } catch (error) {
    console.error('Error with fromBlock 0:', error.message);
  }
}

testEndStakerVerification().catch(console.error);

