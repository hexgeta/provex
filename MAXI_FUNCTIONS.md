# MAXI Contract Functions

**Contract:** Maximus (MAXI)  
**Type:** Single-cycle HEX stake token

---

## 📖 Read Functions (View)

These functions read data from the contract without modifying state.

### Stake Information

| Function                    | Returns   | Description                         |
| --------------------------- | --------- | ----------------------------------- |
| `getHexDay()`               | `uint256` | Current HEX day                     |
| `getStakeStartDay()`        | `uint256` | Day when stake started              |
| `getStakeEndDay()`          | `uint256` | Day when stake ends/ended           |
| `getMintingPhaseStartDay()` | `uint256` | Day minting phase started           |
| `getMintingPhaseEndDay()`   | `uint256` | Day minting phase ended             |
| `getEndStaker()`            | `address` | Who ended the stake (0x0 if active) |
| `getHEXRedemptionRate()`    | `uint256` | HEX per MAXI token (8 decimals)     |
| `getHedronDay()`            | `uint256` | Current Hedron day                  |
| `getHedronRedemptionRate()` | `uint256` | Hedron per MAXI token (8 decimals)  |

### Token Information

| Function                    | Returns   | Description                      |
| --------------------------- | --------- | -------------------------------- |
| `name()`                    | `string`  | Returns "Maximus"                |
| `symbol()`                  | `string`  | Returns "MAXI"                   |
| `decimals()`                | `uint8`   | Always returns `8`               |
| `totalSupply()`             | `uint256` | Total MAXI tokens in circulation |
| `balanceOf(account)`        | `uint256` | MAXI balance of address          |
| `allowance(owner, spender)` | `uint256` | Approved spending amount         |

---

## ✍️ Write Functions

### 🟢 Implemented in UI

| Function          | Parameters                                    | Description                                                                                                                                              |
| ----------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`endStakeHEX`** | `uint256 stakeIndex`<br>`uint40 stakeIdParam` | End the active HEX stake<br>**When:** After stake end day (5555)<br>**Who:** Anyone can call<br>**Index:** Always use `0`                                |
| **`redeemHEX`**   | `uint256 amount_MAXI`                         | Burn MAXI to redeem HEX<br>**When:** After stake is ended<br>**Amount:** MAXI tokens in hearts (8 decimals)<br>**Returns:** HEX based on redemption rate |

### 🟡 Available but Not in UI

| Function         | Parameters                               | Description                                                                                   |
| ---------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------- |
| **`stakeHEX`**   | None                                     | Start a new HEX stake<br>**Status:** MAXI is single-cycle only<br>**Note:** Likely not needed |
| **`mintHedron`** | `uint256 stakeIndex`<br>`uint40 stakeId` | Mint Hedron tokens from stake<br>**When:** If stake supports it<br>**Who:** Anyone can call   |

### 🔴 Not Available (Minting Ended)

| Function        | Parameters       | Description                                                                                                    |
| --------------- | ---------------- | -------------------------------------------------------------------------------------------------------------- |
| **`pledgeHEX`** | `uint256 amount` | Mint MAXI by pledging HEX<br>**Status:** Minting phase has ended<br>**Period:** Was available for limited time |

### Standard ERC20 (Not Needed)

| Function                            | Description                    |
| ----------------------------------- | ------------------------------ |
| `approve(spender, amount)`          | Approve token spending         |
| `transfer(to, amount)`              | Transfer tokens                |
| `transferFrom(from, to, amount)`    | Transfer from approved account |
| `burn(amount)`                      | Burn own tokens                |
| `burnFrom(account, amount)`         | Burn from approved account     |
| `increaseAllowance(spender, value)` | Increase approval              |
| `decreaseAllowance(spender, value)` | Decrease approval              |

---

## 🔄 MAXI Lifecycle

### 1️⃣ Minting Phase (Ended)

- Users pledged HEX to mint MAXI
- Limited time period
- Fixed conversion rate
- **Status:** Completed

### 2️⃣ Active Stake (Current)

- HEX is staked until day 5555
- MAXI tokens are tradeable
- Earning HEX yield from staking
- Waiting for stake end day

### 3️⃣ Stake End

- Anyone can call `endStakeHEX(0, stakeId)`
- HEX returns to contract
- Redemption rate is calculated
- `getEndStaker()` returns caller address

### 4️⃣ Redemption Phase

- Users burn MAXI to claim HEX
- Rate: `getHEXRedemptionRate()`
- Permanent - no time limit
- Pro-rata share of total HEX

---

## 📋 Important Notes

### Decimals & Amounts

- **All amounts use 8 decimals** (HEX standard)
- Example: `1 MAXI = 100000000` (1e8)
- Example: `100 MAXI = 10000000000`

### HEX Day Calculation

- **Day 1:** December 3, 2019 00:00:00 UTC
- **Formula:** `(unix_timestamp - 1575331200) / 86400 + 1`
- **Increments:** Every UTC midnight

### Stake Information

- **Stake End Day:** 5555
- **Stake Type:** Single-cycle (does not repeat)
- **Minting:** No longer available

### Redemption Rate

The rate is calculated when stake ends:

```
HEX Redemption Rate = Total HEX in Contract / Total MAXI Supply
```

Example:

- Total HEX: 1,000,000 HEX
- Total MAXI: 100,000 MAXI
- Rate: 10 HEX per MAXI

### Contract Address

See `constants/crypto.ts`:

- **MAXI:** `0x0d86EB9f43C57f6FF3BC9E23D8F9d82503f0e84b`
- **HEX:** `0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39`
- **Network:** PulseChain (Chain ID: 369)

---

## 🆚 MAXI vs Perpetual Pools

| Feature          | MAXI              | Perpetual Pools       |
| ---------------- | ----------------- | --------------------- |
| **Cycle**        | Single (one-time) | Perpetual (repeating) |
| **Minting**      | Ended             | During reload phase   |
| **Stake Length** | Fixed (~15 years) | Variable (per pool)   |
| **Redemption**   | Permanent         | During reload only    |
| **Use Case**     | Long-term stake   | Recurring yield       |
