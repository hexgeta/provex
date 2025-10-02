const { createPublicClient, http, parseAbi, keccak256, toHex } = require('viem');
const { pulsechain } = require('viem/chains');

const BASE_CONTRACT = '0xe9f84d418b008888a992ff8c6d22389c2c3504e0';

const POOL_ABI = parseAbi([
  'function getEndStaker() view returns (address)',
]);

async function testEndStakerTransaction() {
  const client = createPublicClient({
    chain: pulsechain,
    transport: http(),
  });

  console.log('=== FINDING ENDSTAKER TRANSACTION ===\n');
  
  // Calculate function selector for endStakeHEX(uint256,uint40)
  const functionSignature = 'endStakeHEX(uint256,uint40)';
  const hash = keccak256(toHex(functionSignature));
  const selector = hash.slice(0, 10);
  console.log('Function Selector for endStakeHEX:', selector);
  
  // Get the endStaker
  const endStaker = await client.readContract({
    address: BASE_CONTRACT,
    abi: POOL_ABI,
    functionName: 'getEndStaker',
  });

  console.log('End Staker:', endStaker);
  console.log('\nSearching for transactions from endStaker to BASE contract...\n');

  const currentBlock = await client.getBlockNumber();
  const fromBlock = currentBlock - 1000000n > 0n ? currentBlock - 1000000n : 0n;
  
  console.log(`Searching blocks ${fromBlock} to ${currentBlock}`);
  
  try {
    // Get all logs from the BASE contract
    const logs = await client.getLogs({
      address: BASE_CONTRACT,
      fromBlock,
      toBlock: 'latest',
    });
    
    console.log(`Found ${logs.length} total events from BASE contract\n`);
    
    // Track unique transactions
    const checkedTxs = new Set();
    let foundCount = 0;
    
    // Check each transaction
    for (const log of logs.reverse()) {
      if (checkedTxs.has(log.transactionHash)) continue;
      checkedTxs.add(log.transactionHash);
      
      try {
        const tx = await client.getTransaction({ hash: log.transactionHash });
        
        if (tx.from.toLowerCase() === endStaker.toLowerCase() && 
            tx.to?.toLowerCase() === BASE_CONTRACT.toLowerCase()) {
          
          const functionSelector = tx.input.slice(0, 10);
          foundCount++;
          
          console.log(`${foundCount}. Found transaction from endStaker: ${log.transactionHash}`);
          console.log(`   Function selector: ${functionSelector}`);
          console.log(`   Block: ${log.blockNumber}`);
          
          if (functionSelector === selector) {
            console.log('\n✅ FOUND endStakeHEX CALL!');
            console.log('Transaction Hash:', log.transactionHash);
            console.log(`\nhttps://otter.pulsechain.com/tx/${log.transactionHash}`);
            break;
          }
        }
      } catch (txError) {
        // Skip if we can't get the transaction
      }
    }
    
    console.log(`\nChecked ${checkedTxs.size} unique transactions`);
    
    if (foundCount === 0) {
      console.log('No transactions found from endStaker to BASE contract in this range.');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testEndStakerTransaction().catch(console.error);

