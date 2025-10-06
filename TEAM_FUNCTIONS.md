# TEAM Contract Functions

**Contract:** Maximus Team (TEAM)  
**Type:** Governance and staking token for Maximus ecosystem

---

## 📖 Read Functions (View)

These functions read data from the contract without modifying state.

### Period Information

| Function              | Returns   | Description                                          |
| --------------------- | --------- | ---------------------------------------------------- |
| `getCurrentPeriod()`  | `uint256` | Current period (even = reload, odd = staking)        |
| `isStakingPeriod()`   | `bool`    | True if odd period (staking), false if even (reload) |
| `MINTING_PHASE_START` | `uint256` | HEX day when TEAM minting started                    |
| `MINTING_PHASE_END`   | `uint256` | HEX day when TEAM minting ended                      |
| `IS_MINTING_ONGOING`  | `bool`    | Whether minting is still active                      |

### Staking Information

| Function                                             | Returns   | Description                               |
| ---------------------------------------------------- | --------- | ----------------------------------------- |
| `GLOBAL_AMOUNT_STAKED`                               | `uint256` | Total TEAM staked by all users            |
| `USER_AMOUNT_STAKED[address]`                        | `uint256` | Total TEAM staked by specific user        |
| `globalStakedTeamPerPeriod[period]`                  | `uint256` | Total TEAM staked in a specific period    |
| `getAddressPeriodEndTotal(address, period, stakeID)` | `uint256` | User's stake amount for a specific period |

### Rewards Information

| Function                                            | Returns              | Description                            |
| --------------------------------------------------- | -------------------- | -------------------------------------- |
| `getPeriodRedemptionRates(ticker, period)`          | `uint256`            | Reward rate per TEAM for ticker/period |
| `getClaimableAmount(user, period, ticker, stakeID)` | `(uint256, address)` | Claimable amount and token address     |
| `periodRedemptionRates[ticker][period]`             | `uint256`            | Redemption rate (scaled by 10^8)       |

### Contract Addresses

| Function                            | Returns   | Description                             |
| ----------------------------------- | --------- | --------------------------------------- |
| `ESCROW_ADDRESS`                    | `address` | 369 MAXI escrow contract                |
| `MYSTERY_BOX_ADDRESS`               | `address` | Mystery box contract                    |
| `STAKE_REWARD_DISTRIBUTION_ADDRESS` | `address` | Rewards distribution contract           |
| `poolAddresses[ticker]`             | `address` | Perpetual pool address by ticker        |
| `getPoolAddresses(ticker)`          | `address` | Get pool address (BASE/TRIO/LUCKY/DECI) |
| `getSupportedTokens(ticker)`        | `address` | Get supported token address             |

### Token Information

| Function                    | Returns   | Description                      |
| --------------------------- | --------- | -------------------------------- |
| `name()`                    | `string`  | Returns "Maximus Team"           |
| `symbol()`                  | `string`  | Returns "TEAM"                   |
| `decimals()`                | `uint8`   | Always returns `8`               |
| `totalSupply()`             | `uint256` | Total TEAM tokens in circulation |
| `balanceOf(account)`        | `uint256` | TEAM balance of address          |
| `allowance(owner, spender)` | `uint256` | Approved spending amount         |

---

## ✍️ Write Functions

### 🟢 Core User Functions

| Function                  | Parameters                            | Description                                                                                                                         |
| ------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **`stakeTeam`**           | `uint256 amount`                      | Stake TEAM tokens<br>**Effect:** Burns tokens, adds to stake record<br>**When:** Anytime<br>**Amount:** TEAM in hearts (8 decimals) |
| **`earlyEndStakeTeam`**   | `uint256 stakeID`<br>`uint256 amount` | End stake early with 3.69% penalty<br>**When:** Before/during expiry period<br>**Penalty:** 3.69% of amount                         |
| **`endCompletedStake`**   | `uint256 stakeID`<br>`uint256 amount` | End stake after completion, no penalty<br>**When:** After expiry period ends<br>**Returns:** Full amount                            |
| **`extendStake`**         | `uint256 stakeID`                     | Extend current stake to next period<br>**When:** During stake expiry period only<br>**Effect:** Rolls entire stake forward          |
| **`restakeExpiredStake`** | `uint256 stakeID`                     | Restake expired stake to next period<br>**When:** After stake expires<br>**Effect:** Auto-restakes without reminting                |

### 🟡 Rewards Functions

| Function           | Parameters             | Description                                                                                                                                               |
| ------------------ | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`prepareClaim`** | `string memory ticker` | Prepare rewards for claiming<br>**When:** After staking period ends (reload phase)<br>**Who:** Anyone can call<br>**Effect:** Calculates redemption rates |

### 🔴 Minting Functions (Phase Ended)

| Function              | Parameters       | Description                                                                                                       |
| --------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------- |
| **`mintTEAM`**        | `uint256 amount` | Mint TEAM by burning MAXI<br>**Status:** Minting phase has ended<br>**Ratio:** 1:1 MAXI to TEAM                   |
| **`finalizeMinting`** | None             | Finalize minting phase (one-time)<br>**Status:** Already executed<br>**Effect:** Burns 20% MAXI, distributes rest |

### Standard ERC20

| Function                         | Description                    |
| -------------------------------- | ------------------------------ |
| `approve(spender, amount)`       | Approve token spending         |
| `transfer(to, amount)`           | Transfer tokens                |
| `transferFrom(from, to, amount)` | Transfer from approved account |
| `burn(amount)`                   | Burn own tokens                |
| `burnFrom(account, amount)`      | Burn from approved account     |

---

## 🔄 TEAM Lifecycle

### Periods Overview

| Period                | Type    | Activities                 | Functions Available               |
| --------------------- | ------- | -------------------------- | --------------------------------- |
| **Even (0, 2, 4...)** | Reload  | Pool minting/redeeming     | Stake/unstake TEAM, claim rewards |
| **Odd (1, 3, 5...)**  | Staking | Pools actively staking HEX | Stake TEAM, extend stakes         |

### Staking Flow

#### 1️⃣ Stake TEAM

```
stakeTeam(amount) → Burns TEAM → Creates/updates stake record → Earns rewards
```

#### 2️⃣ Earn Rewards

- Pool tokens from perpetual pools
- HEX, HEDRON, MAXI distributions
- TEAM tokens from various sources
- Pro-rata based on staked amount

#### 3️⃣ Extend or End Stake

```
During expiry period: extendStake(stakeID)
After expiry: endCompletedStake(stakeID, amount) or restakeExpiredStake(stakeID)
Early: earlyEndStakeTeam(stakeID, amount) [3.69% penalty]
```

#### 4️⃣ Claim Rewards

```
prepareClaim(ticker) → Anyone calls after period ends
claimRewards(period, ticker, stakeID) → Called on StakeRewardDistribution contract
```

---

## 📋 Important Notes

### Decimals & Amounts

- **All amounts use 8 decimals** (HEX standard)
- Example: `1 TEAM = 100000000` (1e8)
- Example: `100 TEAM = 10000000000`

### Staking Mechanics

- **Stake burns tokens:** When you stake, TEAM is burned
- **Unstake mints tokens:** When you unstake, TEAM is minted back
- **Penalty:** Early ending = 3.69% penalty (369/10000)
- **StakeID:** Each stake period has unique ID = period number

### Period System

The TEAM contract follows the BASE pool's period:

- **Period 0:** Initial minting (21 days)
- **Period 1:** First stake (369 days)
- **Period 2:** First reload (7 days)
- **Period 3:** Second stake (369 days)
- **Period 4:** Second reload (7 days)
- **Continues forever...**

### Supported Tokens for Rewards

- HEX, MAXI, HDRN (Hedron)
- BASE, TRIO, LUCKY, DECI (perpetual pool tokens)
- TEAM
- ICSA

### Contract Addresses

See `constants/crypto.ts`:

- **TEAM:** `0xAa39296A6b909c20DE5B239d4C998e1b92A6f3f9`
- **Network:** PulseChain (Chain ID: 369)

### 369 MAXI Rebates

- 30% of minting MAXI held in escrow
- Released in years 3, 6, and 9
- Distributed to TEAM stakers
- Periods: 5, 11, 17 respectively

### Mystery Box

- 50% of minting MAXI allocated
- Copy of all TEAM minted into box
- Separate contract, not for user interaction

---

## 🎯 Common Use Cases

### Stake for One Period

```solidity
1. stakeTeam(100000000) // Stake 1 TEAM
2. Wait for period to complete
3. endCompletedStake(stakeID, 100000000) // Get 1 TEAM back
4. Claim rewards via StakeRewardDistribution contract
```

### Long-Term Staking

```solidity
1. stakeTeam(amount)
2. During expiry period: extendStake(stakeID)
3. Repeat extending each period
4. Claim rewards after each period
```

### Emergency Exit

```solidity
earlyEndStakeTeam(stakeID, amount) // Receive amount - 3.69% penalty
```

### Auto-Restaking

```solidity
After stake expires:
restakeExpiredStake(stakeID) // Rolls into next period without claiming
```

---

## ⚠️ Important Warnings

1. **Staking burns tokens:** You must end stake to get TEAM back
2. **Early ending has penalty:** 3.69% of amount is lost
3. **Period timing matters:** Can only extend during expiry period
4. **StakeID tracking:** Keep track of your stake IDs
5. **Rewards require separate claim:** Must call prepareClaim, then claimRewards on distribution contract
