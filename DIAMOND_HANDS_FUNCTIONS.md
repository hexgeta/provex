# Diamond Hands Club (DH) Contract Functions

**Contract:** Diamond Hands Club  
**Type:** Timelock staking for Perpetual Pool tokens  
**Deployed for:** BASE, TRIO, LUCKY, DECI

---

## 📖 Read Functions (View)

These functions read data from the contract without modifying state.

### Pool & Period Information

| Function                 | Returns   | Description                                          |
| ------------------------ | --------- | ---------------------------------------------------- |
| `getCurrentPeriod()`     | `uint256` | Current period from perpetual pool                   |
| `isStakingPeriod()`      | `bool`    | True if odd period (staking), false if even (reload) |
| `PERPETUAL_POOL_ADDRESS` | `address` | Address of associated perpetual pool                 |
| `TICKER_SYMBOL`          | `string`  | Pool token ticker (BASE/TRIO/LUCKY/DECI)             |

### Staking Information

| Function                                             | Returns   | Description                               |
| ---------------------------------------------------- | --------- | ----------------------------------------- |
| `GLOBAL_AMOUNT_STAKED`                               | `uint256` | Total pool tokens locked by all users     |
| `USER_AMOUNT_STAKED[address]`                        | `uint256` | Total pool tokens locked by specific user |
| `globalStakedTokensPerPeriod[period]`                | `uint256` | Total tokens locked for a specific period |
| `getAddressPeriodEndTotal(address, period, stakeID)` | `uint256` | User's locked amount for specific period  |
| `getglobalStakedTokensPerPeriod(period)`             | `uint256` | Get global staked amount for period       |

### Penalty Calculation

| Function                   | Returns   | Description                                                                            |
| -------------------------- | --------- | -------------------------------------------------------------------------------------- |
| `calculatePenalty(amount)` | `uint256` | Calculate early unlock penalty<br>**Formula:** `amount * 0.0369 * 3696 / stake_length` |

### Contract Addresses

| Function                            | Returns   | Description                        |
| ----------------------------------- | --------- | ---------------------------------- |
| `STAKE_REWARD_DISTRIBUTION_ADDRESS` | `address` | Rewards distribution contract      |
| `REWARD_BUCKET_ADDRESS`             | `address` | Penalty collection & reward bucket |
| `TEAM_CONTRACT_ADDRESS`             | `address` | Maximus Team contract              |

---

## ✍️ Write Functions

### 🟢 Core User Functions (Implemented in UI)

| Function                  | Parameters                            | Description                                                                                                                                          |
| ------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`joinClub`**            | `uint256 amount`                      | Lock pool tokens for next period<br>**Requires:** Token approval first<br>**When:** Before pool stake starts<br>**Effect:** Locks tokens in contract |
| **`earlyEndStakeToken`**  | `uint256 stakeID`<br>`uint256 amount` | Unlock tokens early with penalty<br>**When:** Before/during stake period<br>**Penalty:** Scaled based on pool length<br>**Goes to:** Reward bucket   |
| **`endCompletedStake`**   | `uint256 stakeID`<br>`uint256 amount` | Unlock tokens after period, no penalty<br>**When:** After stake period ends<br>**Returns:** Full amount                                              |
| **`extendStake`**         | `uint256 stakeID`                     | Extend lock to next period<br>**When:** During stake period only<br>**Effect:** Rolls entire lock forward                                            |
| **`restakeExpiredStake`** | `uint256 stakeID`                     | Re-lock expired tokens to next period<br>**When:** After stake expires<br>**Effect:** Auto-restakes without unlocking                                |

### 🔧 Setup Functions (One-Time)

| Function                                    | Parameters | Description                                                                                                        |
| ------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------ |
| **`deployStakeRewardDistributionContract`** | None       | Deploy rewards distribution contract<br>**When:** Once after DH deployment<br>**Who:** Anyone (typically deployer) |
| **`deployRewardBucketContract`**            | None       | Deploy reward bucket contract<br>**When:** Once after DH deployment<br>**Who:** Anyone (typically deployer)        |

---

## 🔄 Diamond Hands Lifecycle

### How It Works

```
1. Lock Tokens → 2. Earn Rewards → 3. Unlock/Extend → 4. Claim Rewards
```

### Period Flow

| Period                | Pool Status   | Diamond Hands Activities                                                                              |
| --------------------- | ------------- | ----------------------------------------------------------------------------------------------------- |
| **Even (0, 2, 4...)** | Reload Phase  | Lock tokens for next period<br>Unlock completed locks<br>Claim rewards from previous period           |
| **Odd (1, 3, 5...)**  | Staking Phase | Tokens are locked<br>Lock more for next period<br>Extend current locks<br>Early unlock (with penalty) |

### Detailed Flow

#### 1️⃣ Join the Club (Lock Tokens)

```solidity
// Approve Diamond Hands contract to spend pool tokens
poolToken.approve(diamondHandsAddress, amount)

// Lock tokens for next staking period
joinClub(amount)
```

**When:** Anytime before the stake period starts  
**Effect:** Tokens transferred to DH contract  
**Commitment:** Locked until stake period ends

#### 2️⃣ During Stake Period

**✅ You can:**

- Lock more tokens for the _next_ period
- Extend current lock to next period (during current period only)
- Unlock early (with penalty)

**❌ You cannot:**

- Unlock without penalty (must wait for period to end)

#### 3️⃣ After Stake Period Ends

**✅ You can:**

- Unlock tokens penalty-free: `endCompletedStake(stakeID, amount)`
- Restake to next period: `restakeExpiredStake(stakeID)`
- Lock more tokens for next period
- Claim rewards from completed period

#### 4️⃣ Claiming Rewards

```solidity
// 1. After period ends, anyone calls prepareClaim on RewardBucket
rewardBucket.prepareClaim("BASE") // or TRIO, LUCKY, DECI

// 2. You claim your rewards
dhStakeRewardDistribution.claimRewards(period, ticker, stakeID)
```

---

## 💎 Penalty System

### Penalty Formula

```
penalty = amount * 0.0369 * 3696 / stake_length
```

**Example for BASE (369 day stake):**

```
penalty = amount * 0.0369 * 3696 / 369
penalty = amount * 0.369
penalty = 36.9% of amount
```

**Example for TRIO (1111 day stake):**

```
penalty = amount * 0.0369 * 3696 / 1111
penalty = amount * 0.123
penalty = 12.3% of amount
```

### Penalty Distribution

- **Goes to:** Reward Bucket
- **Benefits:** Users who stayed locked
- **Distributed:** After period ends, pro-rata to all lockers

### Pool-Specific Penalties

| Pool      | Stake Length | Early Unlock Penalty |
| --------- | ------------ | -------------------- |
| **BASE**  | 369 days     | ~36.9%               |
| **TRIO**  | 1,111 days   | ~12.3%               |
| **LUCKY** | 2,555 days   | ~5.3%                |
| **DECI**  | 3,696 days   | ~3.69%               |

---

## 🎁 Rewards System

### What Rewards Can You Earn?

1. **Penalties from early unlocks** (main reward)
2. **TEAM airdrops** (if community members donate)
3. **MAXI airdrops** (if community members donate)
4. **Other supported tokens** (HEX, HDRN, pool tokens, ICSA)

### How Rewards Work

```
Your Share = (Your Locked Tokens / Total Locked Tokens) * Period Rewards
```

### Reward Flow

```
1. Early unlockers → Penalties go to Reward Bucket
2. Period ends → prepareClaim() called on Reward Bucket
3. Rewards transferred to DHStakeRewardDistribution contract
4. Lockers claim their share via claimRewards()
```

### Claiming Process

**Step 1:** Someone calls `prepareClaim()` (anyone can)

```solidity
rewardBucket.prepareClaim("BASE")
rewardBucket.prepareClaim("MAXI")
rewardBucket.prepareClaim("HEX")
// etc for each token
```

**Step 2:** You claim your rewards

```solidity
dhStakeRewardDistribution.claimRewards(period, "BASE", stakeID)
dhStakeRewardDistribution.claimRewards(period, "MAXI", stakeID)
// etc for each token you want to claim
```

---

## 📋 Important Notes

### Decimals & Amounts

- **All amounts use 8 decimals** (HEX standard)
- Example: `1 BASE = 100000000` (1e8)
- Example: `100 BASE = 10000000000`

### Approval Required

Before joining the club, you must approve the Diamond Hands contract:

```solidity
poolToken.approve(diamondHandsAddress, amount)
```

### StakeID System

- **StakeID = Period Number** when you lock
- Each period lock gets unique ID
- Use StakeID to manage your locks
- Example: Lock in period 2 → stakeID = 2

### Period Alignment

Diamond Hands follows the perpetual pool's period schedule:

- **BASE:** 369 day stakes, 7 day reloads
- **TRIO:** 1111 day stakes, 7 day reloads
- **LUCKY:** 2555 day stakes, 14 day reloads
- **DECI:** 3696 day stakes, 14 day reloads

### Contract Deployment

Each perpetual pool has its own Diamond Hands contract:

- BASE Diamond Hands
- TRIO Diamond Hands
- LUCKY Diamond Hands
- DECI Diamond Hands

### Supported Reward Tokens

- HEX, MAXI, HDRN
- BASE, TRIO, LUCKY, DECI
- TEAM
- ICSA

---

## 🎯 Common Use Cases

### Basic Lock & Unlock

```solidity
1. Approve: poolToken.approve(dhAddress, amount)
2. Lock: joinClub(amount)
3. Wait for stake period to end
4. Unlock: endCompletedStake(stakeID, amount)
5. Claim: dhStakeRewardDistribution.claimRewards(period, ticker, stakeID)
```

### Long-Term Diamond Hands

```solidity
1. Lock: joinClub(amount)
2. Each period: extendStake(stakeID)
3. Claim rewards after each period
4. Continue extending...
```

### Auto-Restaking

```solidity
After period expires:
restakeExpiredStake(stakeID) // Auto-relocks for next period
```

### Emergency Unlock

```solidity
earlyEndStakeToken(stakeID, amount) // Get amount minus penalty
```

### Maximize Rewards

```solidity
1. Lock as early as possible (period 0 or reload phase)
2. Stay locked full period (no early unlock)
3. Extend or restake for compounding
4. Claim all reward tokens after each period
```

---

## ⚠️ Important Warnings

1. **Approval needed:** Must approve DH contract before calling `joinClub()`
2. **Penalty is significant:** Early unlock can cost 3.69% to 36.9%
3. **Timing matters:** Can only extend during current stake period
4. **Tokens are locked:** No penalty-free unlock until period ends
5. **Track your stakeIDs:** You need them to manage locks
6. **Claim each token separately:** Must call `claimRewards()` for each reward token
7. **Rewards not automatic:** Someone must call `prepareClaim()` first

---

## 🆚 Diamond Hands vs Regular Pool Holding

| Aspect         | Regular Holding      | Diamond Hands                 |
| -------------- | -------------------- | ----------------------------- |
| **Liquidity**  | Always liquid        | Locked until period ends      |
| **Rewards**    | None                 | Share of penalties + airdrops |
| **Risk**       | Price volatility     | Lock-up + price volatility    |
| **Commitment** | None                 | Full stake period             |
| **Early Exit** | No cost              | 3.69% - 36.9% penalty         |
| **Best For**   | Traders, flexibility | Long-term believers           |

---

## 🔗 Contract Addresses

Diamond Hands contracts for each pool on PulseChain (Chain ID: 369):

See `constants/crypto.ts` for current addresses:

```typescript
export const DIAMOND_HANDS_CONTRACTS = {
  BASE: "0x...",
  TRIO: "0x...",
  LUCKY: "0x...",
  DECI: "0x...",
};
```

---

## 💡 Pro Tips

1. **Lock early:** Join during period 0 or reload phase to maximize time
2. **Stay committed:** Penalty is harsh, only lock what you won't need
3. **Extend strategically:** Use `extendStake()` during period to save gas vs restaking
4. **Claim regularly:** Claim rewards after each period completes
5. **Track all tokens:** Check for HEX, MAXI, TEAM, pool tokens, etc.
6. **Community rewards:** Some TEAM/MAXI holders may airdrop to reward buckets
