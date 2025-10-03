# Perpetual Pool Contract Functions

**Applies to:** DECI, LUCKY, TRIO, BASE

---

## 📖 Read Functions (View)

These functions read data from the contract without modifying state.

| Function                    | Returns   | Description                            |
| --------------------------- | --------- | -------------------------------------- |
| `STAKE_IS_ACTIVE()`         | `bool`    | Is the stake currently active?         |
| `STAKE_START_DAY()`         | `uint256` | HEX day when stake started             |
| `STAKE_END_DAY()`           | `uint256` | HEX day when stake ends                |
| `STAKE_LENGTH()`            | `uint256` | Stake duration in days                 |
| `CURRENT_PERIOD()`          | `uint256` | Current cycle period number            |
| `CURRENT_STAKE_PRINCIPAL()` | `uint256` | HEX amount staked (hearts, 8 decimals) |
| `HEX_REDEMPTION_RATE()`     | `uint256` | HEX per token (8 decimals)             |
| `RELOAD_PHASE_START()`      | `uint256` | HEX day reload phase starts            |
| `RELOAD_PHASE_END()`        | `uint256` | HEX day reload phase ends              |
| `RELOAD_PHASE_DURATION()`   | `uint256` | Reload phase length in days            |
| `END_STAKER()`              | `address` | Who ended the stake (0x0 if active)    |
| `TEAM_CONTRACT_ADDRESS()`   | `address` | Team fee recipient address             |
| `getHexDay()`               | `uint256` | Current HEX day                        |
| `getCurrentPeriod()`        | `uint256` | Current period number                  |
| `getEndStaker()`            | `address` | Address of stake ender                 |

### Token Functions

| Function                    | Returns   | Description                  |
| --------------------------- | --------- | ---------------------------- |
| `name()`                    | `string`  | Token name (e.g., "Decimus") |
| `symbol()`                  | `string`  | Token symbol (e.g., "DECI")  |
| `decimals()`                | `uint8`   | Always returns `8`           |
| `totalSupply()`             | `uint256` | Total tokens in circulation  |
| `balanceOf(account)`        | `uint256` | Token balance of address     |
| `allowance(owner, spender)` | `uint256` | Approved spending amount     |

---

## ✍️ Write Functions

### 🟢 Implemented in UI

| Function          | Parameters                                    | Description                                                                                                                               |
| ----------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **`endStakeHEX`** | `uint256 stakeIndex`<br>`uint40 stakeIdParam` | End the active HEX stake<br>**When:** After stake end day<br>**Who:** Anyone can call                                                     |
| **`redeemHEX`**   | `uint256 amount`                              | Burn tokens to redeem HEX<br>**When:** After stake is ended<br>**Amount:** In hearts (8 decimals)                                         |
| **`pledgeHEX`**   | `uint256 amount`                              | Pledge HEX to mint tokens<br>**When:** During reload phase<br>**Amount:** In hearts (8 decimals)<br>**Note:** Requires HEX approval first |

### 🟡 Available but Not in UI

| Function         | Parameters                               | Description                                                                                                             |
| ---------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **`stakeHEX`**   | None                                     | Start a new HEX stake<br>**When:** After reload phase ends<br>**Who:** Anyone can call<br>**Uses:** All HEX in contract |
| **`mintHedron`** | `uint256 stakeIndex`<br>`uint40 stakeId` | Mint Hedron tokens from stake<br>**When:** During active stake<br>**Who:** Anyone can call                              |

### Standard ERC20 (Not Needed)

| Function                                  | Description                                      |
| ----------------------------------------- | ------------------------------------------------ |
| `approve(spender, amount)`                | Approve token spending (handled by HEX approval) |
| `transfer(recipient, amount)`             | Transfer tokens                                  |
| `transferFrom(sender, recipient, amount)` | Transfer from approved account                   |
| `burn(amount)`                            | Burn own tokens                                  |
| `burnFrom(account, amount)`               | Burn from approved account                       |
| `increaseAllowance(spender, value)`       | Increase approval                                |
| `decreaseAllowance(spender, value)`       | Decrease approval                                |

---

## 🔄 Perpetual Cycle Phases

### 1️⃣ Active Stake Phase

- `STAKE_IS_ACTIVE()` returns `true`
- HEX is staked and earning yield
- Users can transfer tokens freely
- Wait until current day > stake end day

### 2️⃣ End Stake

- Anyone calls `endStakeHEX(0, stakeId)`
- Stake is ended and HEX returns to contract
- `END_STAKER()` is set to caller's address
- `HEX_REDEMPTION_RATE()` is calculated

### 3️⃣ Reload Phase

- Lasts for `RELOAD_PHASE_DURATION()` days
- Users can call `redeemHEX()` to claim HEX
- Users can call `pledgeHEX()` to mint new tokens
- New users can enter, existing users can exit

### 4️⃣ Ready to Restart

- Reload phase has ended
- Waiting for someone to call `stakeHEX()`
- All accumulated HEX will be staked

### 5️⃣ Cycle Repeats

- New stake begins → back to phase 1
- Period increments by 1
- Process continues indefinitely

---

## 📋 Important Notes

### Decimals & Amounts

- **All amounts use 8 decimals** (HEX standard)
- Example: `1 HEX = 100000000` (1e8)
- Example: `0.5 HEX = 50000000`

### HEX Day Calculation

- **Day 1:** December 3, 2019 00:00:00 UTC
- **Formula:** `(unix_timestamp - 1575331200) / 86400 + 1`
- **Increments:** Every UTC midnight

### Approvals

To mint tokens during reload phase:

1. First approve HEX: `HEX.approve(poolAddress, amount)`
2. Then pledge: `pool.pledgeHEX(amount)`

### Contract Addresses

See `constants/crypto.ts` for current addresses:

- **DECI:** Decimus Pool
- **LUCKY:** Lucky Pool
- **TRIO:** Trio Pool
- **BASE:** Base Pool
- **HEX:** `0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39`

All contracts deployed on **PulseChain** (Chain ID: 369)
