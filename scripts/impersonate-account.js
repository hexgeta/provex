/**
 * Impersonate Account Script
 * 
 * This script allows you to impersonate any Ethereum address on your local fork
 * so you can test transactions from accounts that hold pool tokens.
 * 
 * Usage:
 * npx hardhat run scripts/impersonate-account.js --network localhost
 */

const hre = require("hardhat");

async function impersonateAccount(address) {
  console.log(`\n🎭 Impersonating account: ${address}`);
  
  try {
    // Enable impersonation
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [address],
    });
    
    // Fund the account with ETH for gas
    await hre.network.provider.send("hardhat_setBalance", [
      address,
      "0x56BC75E2D63100000", // 100 ETH
    ]);
    
    console.log(`✅ Account impersonated successfully!`);
    console.log(`   Funded with 100 ETH for gas`);
    
    // Get the signer
    const signer = await hre.ethers.getSigner(address);
    const balance = await hre.ethers.provider.getBalance(address);
    
    console.log(`   Balance: ${hre.ethers.formatEther(balance)} ETH`);
    
    return signer;
  } catch (error) {
    console.error(`❌ Error impersonating account: ${error.message}`);
    throw error;
  }
}

async function stopImpersonating(address) {
  console.log(`\n🛑 Stopping impersonation of: ${address}`);
  
  try {
    await hre.network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [address],
    });
    
    console.log(`✅ Stopped impersonating account`);
  } catch (error) {
    console.error(`❌ Error stopping impersonation: ${error.message}`);
    throw error;
  }
}

async function getTokenBalance(tokenAddress, holderAddress) {
  console.log(`\n💰 Checking token balance...`);
  console.log(`   Token: ${tokenAddress}`);
  console.log(`   Holder: ${holderAddress}`);
  
  try {
    const tokenABI = [
      "function balanceOf(address) view returns (uint256)",
      "function decimals() view returns (uint8)",
      "function symbol() view returns (string)",
    ];
    
    const token = await hre.ethers.getContractAt(tokenABI, tokenAddress);
    const balance = await token.balanceOf(holderAddress);
    const decimals = await token.decimals();
    const symbol = await token.symbol();
    
    console.log(`   Balance: ${hre.ethers.formatUnits(balance, decimals)} ${symbol}`);
    
    return { balance, decimals, symbol };
  } catch (error) {
    console.error(`   ❌ Error getting token balance: ${error.message}`);
    return null;
  }
}

async function findTokenHolders(tokenAddress, knownHolders = []) {
  console.log(`\n🔍 Finding token holders for: ${tokenAddress}`);
  
  // Some known large holders for common tokens
  const defaultHolders = {
    // MAXI holders on Ethereum
    "0x0d86EB9f43C57f6FF3BC9E23D8F9d82503f0e84b": [
      "0x...", // Add known MAXI holders
    ],
    // TRIO holders
    "0xF55cD1e399e1cc3D95303048897a680be3313308": [
      "0x...", // Add known TRIO holders
    ],
  };
  
  const holders = knownHolders.length > 0 
    ? knownHolders 
    : defaultHolders[tokenAddress] || [];
  
  if (holders.length === 0) {
    console.log("   ⚠️  No known holders provided. Check block explorer for large holders.");
    return [];
  }
  
  console.log(`   Testing ${holders.length} potential holders...`);
  
  const holdersWithBalance = [];
  
  for (const holder of holders) {
    const result = await getTokenBalance(tokenAddress, holder);
    if (result && result.balance > 0n) {
      holdersWithBalance.push({ address: holder, ...result });
    }
  }
  
  console.log(`\n   Found ${holdersWithBalance.length} holders with balance`);
  
  return holdersWithBalance;
}

async function main() {
  const args = process.argv.slice(2);
  const accountToImpersonate = args[0];
  const tokenAddress = args[1];
  
  console.log("\n🎭 Account Impersonation Tool");
  console.log("==============================");
  
  if (!accountToImpersonate) {
    console.log("\n❌ Please provide an account address to impersonate");
    console.log("\nUsage:");
    console.log("  npx hardhat run scripts/impersonate-account.js --network localhost <ADDRESS> [TOKEN_ADDRESS]");
    console.log("\nExample:");
    console.log("  npx hardhat run scripts/impersonate-account.js --network localhost 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb 0x0d86EB9f43C57f6FF3BC9E23D8F9d82503f0e84b");
    return;
  }
  
  // Impersonate the account
  const signer = await impersonateAccount(accountToImpersonate);
  
  // If token address provided, check balance
  if (tokenAddress) {
    await getTokenBalance(tokenAddress, accountToImpersonate);
  }
  
  console.log("\n💡 Tips:");
  console.log("   - The impersonated account now has 100 ETH for gas");
  console.log("   - You can now use this account to test transactions");
  console.log("   - In your frontend, connect MetaMask to http://localhost:8545");
  console.log("   - Import this private key to MetaMask (for testing only!):");
  console.log("   - Or use the impersonated account directly in scripts");
  console.log("\n✨ Impersonation active!");
}

if (require.main === module) {
  main()
    .then(() => {
      // Keep the script running to maintain impersonation
      console.log("\n⏳ Keeping impersonation active... (Press Ctrl+C to stop)");
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = {
  impersonateAccount,
  stopImpersonating,
  getTokenBalance,
  findTokenHolders,
};

