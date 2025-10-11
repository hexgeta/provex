# 🧪 Local Blockchain Testing Guide

Test your time-dependent staking features by forking Ethereum/PulseChain locally and fast-forwarding time.

## 🚀 Quick Start (3 Steps)

### 1. Start a Fork

⚠️ **Both forks use port 8545 - run ONE at a time!**

```bash
npm run fork:ethereum        # Ethereum fork on port 8545
# OR
npm run fork:pulsechain      # PulseChain fork on port 8545

# To switch forks: pkill -f "hardhat node" then start the other one
```

### 2. Connect to Local Fork

**In Rabby Wallet**, temporarily point PulseChain to your local fork:

1. Open Rabby → Networks → Find **PulseChain** (Chain ID 369)
2. Edit the RPC URL from `https://rpc.pulsechain.com` to `http://127.0.0.1:8545`
3. Save
4. Go to **http://localhost:3000** and connect
5. The app will now read from your local fork!

⚠️ **Remember**: Change the RPC back to `https://rpc.pulsechain.com` when you're done testing.

💡 The fork inherits the chain data from whichever network you started (Ethereum or PulseChain).

### 3. Import Test Account (Optional)

The fork comes with 20 test accounts, each with 10,000 PLS/ETH for gas.

**Easy option:** Import Account #17 in Rabby:

```
Private Key: 0x689af8efa8c651a91ad287602527f3af2fe9f6501a7ac4b061667b5a93e037fd
Address: 0xbDA5747bFD65F08deb54cb465eB87D40e51B197E
```

⚠️ **This key is public - NEVER use it with real funds!**

Or just connect with your existing wallet - you're testing with forked mainnet data, so you can view real stakes!

### 4. Fast Forward Time & Test

```bash
# Fast forward time by days
TIME_CMD=forward TIME_DAYS=5555 npx hardhat run scripts/fast-forward-time.js --network localhost

# Check current time
npm run time:status
```

Open `http://localhost:3000`, connect to "Local Fork (PLS/ETH)", and test!

## 📋 Available Commands

```bash
# Start forks (port 8545 - run ONE at a time)
npm run fork:ethereum                # Start Ethereum fork
npm run fork:pulsechain              # Start PulseChain fork

# Time manipulation
TIME_CMD=forward TIME_DAYS=<days> npx hardhat run scripts/fast-forward-time.js --network localhost
npm run time:status                  # Check current time

# Automated testing
npm run test:stakes                  # Test all pools
npm run test:stakes MAXI             # Test specific pool

# Stop/Switch forks
pkill -f "hardhat node"              # Stop current fork (to switch to another)
```

## 🎯 Test Each Pool

| Pool      | Fast Forward Command                                                                               | Features to Test                 |
| --------- | -------------------------------------------------------------------------------------------------- | -------------------------------- |
| **MAXI**  | `TIME_CMD=forward TIME_DAYS=5555 npx hardhat run scripts/fast-forward-time.js --network localhost` | Mint Hedron → End Stake → Redeem |
| **TRIO**  | `TIME_CMD=forward TIME_DAYS=1111 npx hardhat run scripts/fast-forward-time.js --network localhost` | End Stake → Diamond Hands        |
| **BASE**  | `TIME_CMD=forward TIME_DAYS=369 npx hardhat run scripts/fast-forward-time.js --network localhost`  | End Stake → Diamond Hands        |
| **DECI**  | `TIME_CMD=forward TIME_DAYS=3696 npx hardhat run scripts/fast-forward-time.js --network localhost` | End Stake → Diamond Hands        |
| **LUCKY** | `TIME_CMD=forward TIME_DAYS=2555 npx hardhat run scripts/fast-forward-time.js --network localhost` | End Stake → Diamond Hands        |

## 💎 Testing Diamond Hands

1. Lock tokens in Diamond Hands section
2. Fast forward: `TIME_CMD=forward TIME_DAYS=369 npx hardhat run scripts/fast-forward-time.js --network localhost`
3. Test unlock (penalty-free after full period)
4. Test claim rewards

## 🏆 Testing Team Staking

1. Navigate to Team page
2. Stake TEAM tokens
3. Fast forward past staking + reward periods
4. Claim rewards
5. Withdraw

## 🐛 Troubleshooting

**Fork won't start?**

```bash
lsof -ti:8545 | xargs kill -9  # Kill port 8545
npm run fork:ethereum          # Try again
```

**Rabby showing wrong data?**

- Hard refresh: `Cmd + Shift + R`
- Clear Rabby cache if needed
- Make sure you're on the local network

**Time didn't advance?**

```bash
npm run time:status  # Verify time changed
# Then hard refresh browser
```

## 🔧 Advanced Usage

### Impersonate an Account

```bash
# Find a whale address on Etherscan, then:
npx hardhat run scripts/impersonate-account.js --network localhost <ADDRESS>
```

### Stop Everything

```bash
pkill -f "hardhat node"  # Stop forks
pkill -f "next dev"      # Stop dev server
```

## 💡 Pro Tips

1. **Keep 3 terminals open**: Fork | Commands | Dev Server
2. **Hard refresh after time changes**: `Cmd + Shift + R`
3. **Forks use latest block**: Always fresh state from mainnet
4. **Forks are temporary**: Restart to reset all state

---

That's it! Start a fork, fast forward time, and test your features. 🚀
