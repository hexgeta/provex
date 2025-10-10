/**
 * Fast Forward Time Script
 * 
 * This script allows you to manipulate time on your local Hardhat fork
 * to test time-dependent staking functions.
 * 
 * Usage:
 * npx hardhat run scripts/fast-forward-time.js --network localhost
 */

const hre = require("hardhat");

async function fastForwardTime(days = 1) {
  const seconds = days * 24 * 60 * 60;
  
  console.log(`\n🕐 Fast forwarding time by ${days} days (${seconds} seconds)...`);
  
  try {
    // Increase time by the specified amount
    await hre.network.provider.send("evm_increaseTime", [seconds]);
    
    // Mine a new block to apply the time change
    await hre.network.provider.send("evm_mine");
    
    // Get the current block to verify
    const blockNumber = await hre.ethers.provider.getBlockNumber();
    const block = await hre.ethers.provider.getBlock(blockNumber);
    const timestamp = block.timestamp;
    
    console.log(`✅ Time advanced successfully!`);
    console.log(`   Block Number: ${blockNumber}`);
    console.log(`   New Timestamp: ${timestamp}`);
    console.log(`   Date: ${new Date(timestamp * 1000).toLocaleString()}`);
    
    return timestamp;
  } catch (error) {
    console.error("❌ Error fast forwarding time:", error.message);
    throw error;
  }
}

async function getCurrentTime() {
  const blockNumber = await hre.ethers.provider.getBlockNumber();
  const block = await hre.ethers.provider.getBlock(blockNumber);
  return {
    blockNumber,
    timestamp: block.timestamp,
    date: new Date(block.timestamp * 1000).toLocaleString()
  };
}

async function fastForwardToTimestamp(targetTimestamp) {
  const current = await getCurrentTime();
  const currentTimestamp = current.timestamp;
  
  if (targetTimestamp <= currentTimestamp) {
    console.log("⚠️  Target timestamp is in the past or present. No action needed.");
    return currentTimestamp;
  }
  
  const secondsToAdvance = targetTimestamp - currentTimestamp;
  const daysToAdvance = Math.ceil(secondsToAdvance / (24 * 60 * 60));
  
  console.log(`\n🕐 Fast forwarding to timestamp ${targetTimestamp}`);
  console.log(`   Current: ${currentTimestamp} (${current.date})`);
  console.log(`   Target:  ${targetTimestamp} (${new Date(targetTimestamp * 1000).toLocaleString()})`);
  console.log(`   Advancing: ${daysToAdvance} days (${secondsToAdvance} seconds)`);
  
  await hre.network.provider.send("evm_increaseTime", [secondsToAdvance]);
  await hre.network.provider.send("evm_mine");
  
  const newTime = await getCurrentTime();
  console.log(`✅ Time advanced successfully!`);
  console.log(`   New Timestamp: ${newTime.timestamp}`);
  console.log(`   Date: ${newTime.date}`);
  
  return newTime.timestamp;
}

// Main execution
async function main() {
  // Get command from environment variable or first argument
  const command = process.env.TIME_CMD || process.argv[2];
  const daysArg = process.env.TIME_DAYS || process.argv[3];
  
  console.log("\n⏰ Time Manipulation Script");
  console.log("============================");
  
  if (command === "status" || !command) {
    const current = await getCurrentTime();
    console.log("\n📊 Current Blockchain Time:");
    console.log(`   Block Number: ${current.blockNumber}`);
    console.log(`   Timestamp: ${current.timestamp}`);
    console.log(`   Date: ${current.date}`);
    return;
  }
  
  if (command === "forward") {
    const days = parseInt(daysArg) || 1;
    await fastForwardTime(days);
    return;
  }
  
  if (command === "to") {
    const targetTimestamp = parseInt(daysArg);
    if (!targetTimestamp) {
      console.error("❌ Please provide a target timestamp");
      return;
    }
    await fastForwardToTimestamp(targetTimestamp);
    return;
  }
  
  // Default: fast forward by specified days or 1 day
  const days = parseInt(command) || 1;
  await fastForwardTime(days);
}

// Run if called directly
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

// Export functions for use in other scripts
module.exports = {
  fastForwardTime,
  getCurrentTime,
  fastForwardToTimestamp,
};

