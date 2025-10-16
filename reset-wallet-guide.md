# Avoiding Nonce Issues with Local Fork

## Option 1: Reset Wallet After Each Fork Restart (Recommended)
1. Kill the fork: `lsof -ti:8545 | xargs kill -9`
2. Restart the fork: `FORK_URL=https://rpc.pulsechain.com FORK_BLOCK=<block> npm run fork:pulsechain`
3. In Rabby: Disconnect from "Local Fork2" network
4. Reconnect to "Local Fork2" network
5. This resets the nonce counter in your wallet

## Option 2: Use Hardhat Test Account
Import one of the Hardhat test accounts into your wallet:
- Address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
- Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
- Comes with 10,000 ETH

Then fund it with tokens using impersonation scripts.

## Option 3: Manual Nonce Fix (When it happens)
If you get "nonce too high" error:
1. Note the expected nonce from the error message
2. In the transaction dialog, manually set the nonce to the expected value
3. Or disconnect/reconnect wallet to reset

## Why This Happens
- Each blockchain restart creates a fresh state from the fork block
- Your wallet remembers the nonce from before the restart
- The blockchain expects nonce to start fresh
- Resetting the wallet clears its nonce cache
