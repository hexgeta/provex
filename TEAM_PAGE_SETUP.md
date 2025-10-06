# TEAM Staking Page Setup

## 🎉 What Was Created

I've created a complete TEAM staking and rewards claiming interface for your dapp!

## 📁 Files Created

### 1. **`constants/team.ts`**

- TEAM contract address
- Reward token list (HEX, BASE, TRIO, LUCKY, DECI, MAXI, HDRN, TEAM, ICSA)
- Token addresses mapping

### 2. **`hooks/contracts/useTeamStaking.ts`**

Complete hook for all TEAM operations:

- **Read functions**: Get balances, periods, staking info, claimable amounts
- **Write functions**: Stake, unstake, extend, restake, prepare claims, claim rewards
- **State management**: Loading states, refetch functions

### 3. **`app/team/page.tsx`**

Full-featured TEAM staking page with:

- **Stats Dashboard**: Balance, staked amount, current period
- **Stake Tab**: Stake TEAM with amount input and MAX button
- **Unstake Tab**:
  - End completed stake (no penalty)
  - Early end stake (3.69% penalty with confirmation)
  - Extend stake to next period
  - Restake expired stake
- **Rewards Tab**:
  - Prepare claims section (anyone can call)
  - Claim rewards for all 9 supported tokens
  - Real-time status checking (prepared, claimable, claimed)
  - Period and stake ID inputs

### 4. **`components/Footer.tsx`** (Updated)

- Added "Staking" column
- Link to TEAM page at `/team`

## 🚀 Features

### Stake/Unstake Section

- **Stake TEAM**: Burns tokens, adds to stake record
- **End Completed**: Unstake after period ends (no penalty)
- **Early End**: Unstake early with 3.69% penalty (requires confirmation)
- **Extend Stake**: Roll current stake to next period
- **Restake Expired**: Auto-restake expired stake

### Rewards Claiming Section

- **Two-Step Process**:

  1. **Prepare Claims**: Anyone calls `prepareClaim(ticker)` for each token
  2. **Claim Rewards**: Users claim their share based on staked amount

- **Visual Status Indicators**:

  - ✅ Green = Prepared/Claimed
  - ⚙️ Purple = Not prepared yet
  - Loading spinner during transactions

- **Smart UI**:
  - Only shows claimable amounts after preparation
  - Disables claimed rewards
  - Shows period context and stake ID hints

### User Experience

- **Period Banner**: Shows when reload phase begins and rewards are available
- **Real-time Stats**: Balance, staked, current period
- **Input Validation**: Commas formatting, decimal precision (8 decimals)
- **MAX Buttons**: Quick fill for stake/unstake amounts
- **Loading States**: Spinner animations during transactions
- **Error Handling**: Try-catch with user-friendly alerts
- **Info Tooltips**: Contextual help throughout

## 🎯 User Flow

### For Staking:

```
1. User goes to /team
2. Enters amount to stake
3. Clicks "Stake TEAM"
4. TEAM is burned and added to stake record
5. User earns rewards during staking period
```

### For Claiming Rewards:

```
1. Period ends (e.g., Period 1 → Period 2)
2. User goes to Rewards tab
3. Inputs:
   - Period to claim from (e.g., 1)
   - Their stake ID (e.g., 1 if they staked in period 1)
4. Step 1: Someone calls "Prepare" for each token (⚙️ → ✅)
5. Step 2: User clicks "Claim" for each token with rewards
6. Tokens sent to wallet
```

## 📝 What You Need to Do

### 1. Update Stake Reward Distribution Address

In `constants/team.ts`, line 7:

```typescript
export const TEAM_STAKE_REWARD_DISTRIBUTION = "0x..." as Address; // TODO: Get from contract
```

**How to get it:**

- Call `STAKE_REWARD_DISTRIBUTION_ADDRESS()` on TEAM contract
- Or it will be auto-fetched from the hook (already implemented)

### 2. Test the Page

```bash
npm run dev
# Visit http://localhost:3000/team
```

### 3. Testing Checklist

- [ ] Connect wallet
- [ ] View stats (balance, staked, period)
- [ ] Stake TEAM
- [ ] Check if period is staking or reload
- [ ] During reload: Try claiming rewards
- [ ] Prepare claims for tokens
- [ ] Claim rewards
- [ ] Unstake (completed or early)
- [ ] Try extend/restake features

## 🔧 Technical Details

### Contract Integration

- Uses wagmi hooks (`useContractRead`, `usePublicClient`, `useWalletClient`)
- Proper ABI parsing with viem's `parseAbi`
- Transaction simulation before execution
- Receipt waiting and refetching

### State Management

- React hooks for local state
- Refs for input cursor position preservation
- useEffect for auto-loading on period/stakeID change
- Loading states for better UX

### Styling

- Tailwind CSS with gradient backgrounds
- Purple/blue theme for TEAM
- Responsive grid layouts (mobile-friendly)
- Icon integration (lucide-react)

## 🎨 UI Components Used

- Tabs (from shadcn/ui)
- Custom inputs with comma formatting
- Loading spinners (Loader2 from lucide-react)
- Icons: TrendingUp, Gift, Info
- Gradient cards for stats
- Status badges for prepared/claimed states

## 📊 Supported Reward Tokens

1. HEX - Hexagon token
2. BASE - Perpetual pool token
3. TRIO - Perpetual pool token
4. LUCKY - Perpetual pool token
5. DECI - Perpetual pool token
6. MAXI - Maximus token
7. HDRN - Hedron token
8. TEAM - Team token (from protocol fees)
9. ICSA - Icosa token

## 🔗 Contract Addresses (PulseChain)

- **TEAM**: `0xb7c9e99da8a857ce576a830a9c19312114d9de02`
- **All reward tokens**: See `constants/team.ts`

## ⚠️ Important Notes

1. **Period System**:

   - Even periods = Reload phase (can claim rewards)
   - Odd periods = Staking phase (cannot claim)

2. **Stake ID**:

   - Equals the period number when you staked
   - If you staked in period 1, your stake ID is 1

3. **Penalties**:

   - Early unstaking = 3.69% penalty
   - Completed unstaking = No penalty

4. **Prepare Claims**:

   - Must be called once per token per period
   - Anyone can call it (gas cost only)
   - After calling, rewards become claimable

5. **Multiple Stakes**:
   - Users can have multiple stake IDs
   - Each period creates a new stake ID
   - Must claim separately for each stake ID

## 🎯 Next Steps

1. Test all functionality
2. Update the stake reward distribution address
3. Consider adding:
   - Transaction history
   - Stake records display
   - APY calculator
   - Multi-stake management
   - Notification system for period changes

## 📞 Support

If you encounter any issues:

1. Check browser console for errors
2. Verify wallet is connected to PulseChain (Chain ID: 369)
3. Ensure you have TEAM tokens to stake
4. Check that current period is correct on contract

Enjoy your new TEAM staking page! 🚀
