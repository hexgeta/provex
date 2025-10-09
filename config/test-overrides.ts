import { Address } from 'viem';

// ==============================================================================
// 🧪 TESTING SETUP
// ==============================================================================
// HOW TO USE:
// 1. Set TESTING_ON = true to enable test mode
// 2. Change CURRENT_SCENARIO to test different states
// 3. Refresh your app to see the changes
//
// Available scenarios:
//   - STAKE_ACTIVE: Stake is running (can view countdown)
//   - STAKE_ENDED_NO_HEDRON: Stake ended, need to mint hedron first
//   - STAKE_ENDED_HEDRON_MINTED: Ready to end the stake
//   - RELOAD_PHASE: Can mint/redeem/lock tokens (Diamond Hands)
//   - READY_TO_START: Ready to start new stake
// ==============================================================================

// Master toggle - set to true to use test overrides instead of real contract data
export const TESTING_ON = false;

// ==============================================================================
// QUICK TEST SCENARIOS - Change this to switch between different states
// ==============================================================================
type TestScenario = 
  | 'STAKE_ACTIVE'              // Stake is currently running
  | 'STAKE_ENDED_NO_HEDRON'     // Stake ended, hedron not minted yet
  | 'STAKE_ENDED_HEDRON_MINTED' // Stake ended, hedron minted, ready to end
  | 'RELOAD_PHASE'              // Between stakes, can mint/redeem tokens
  | 'READY_TO_START'            // Reload phase ended, ready to start new stake
  ;

export const CURRENT_SCENARIO: TestScenario = 'RELOAD_PHASE';

// Test overrides for each pool - only functional read values
export interface PoolTestOverrides {
  stakeIsActive?: boolean;
  stakeEndDay?: bigint;
  stakeStartDay?: bigint;
  currentHexDay?: bigint;
  currentPeriod?: bigint;
  currentStakePrincipal?: bigint;
  hexRedemptionRate?: bigint;
  reloadPhaseEnd?: bigint;
  reloadPhaseStart?: bigint;
  reloadPhaseDuration?: bigint;
  stakeLength?: bigint;
  userBalance?: bigint;
  totalSupply?: bigint;
  stakeCount?: bigint;
  stakeInfo?: readonly [bigint, bigint, bigint, number, number, number, boolean];
  endStaker?: `0x${string}`;
  teamContractAddress?: `0x${string}`;
  decimals?: number;
  hasHedronMinted?: boolean;
}

// ==============================================================================
// SCENARIO CONFIGS
// ==============================================================================
const SCENARIOS = {
  // ============================================================================
  // SCENARIO 1: STAKE_ACTIVE
  // ============================================================================
  // What you'll see:
  //   - Stake Info tab: Countdown timer showing time remaining
  //   - End The Stake tab: "Mint Hedron" and "End Stake" buttons disabled
  //   - Claim HEX tab: "Redeem Your HEX" disabled (stake must end first)
  //   - Mint tab: Minting disabled (only during reload phase)
  // What you can do: Watch countdown, view stake info
  // ============================================================================
  STAKE_ACTIVE: {
    stakeIsActive: true,
    stakeEndDay: 2000n,      // Future
    stakeStartDay: 1000n,
    currentHexDay: 1500n,    // Midway through stake
    currentPeriod: 3n,
    reloadPhaseEnd: 0n,      // No reload phase during stake
    reloadPhaseStart: 0n,
    hasHedronMinted: false,
    endStaker: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  },

  // ============================================================================
  // SCENARIO 2: STAKE_ENDED_NO_HEDRON
  // ============================================================================
  // What you'll see:
  //   - Stake Info tab: "Stake is ready to be ended!" message
  //   - End The Stake tab: "Mint Hedron" button enabled (green)
  //   - End The Stake tab: "End Stake" button disabled (need hedron first)
  //   - Claim HEX tab: Redeem still disabled
  //   - Mint tab: Minting disabled
  // What you can do: Click "Mint Hedron" to move to next scenario
  // ============================================================================
  STAKE_ENDED_NO_HEDRON: {
    stakeIsActive: true,     // Still technically active until ended
    stakeEndDay: 1000n,
    stakeStartDay: 631n,
    currentHexDay: 1001n,    // Past end day
    currentPeriod: 3n,
    reloadPhaseEnd: 0n,
    reloadPhaseStart: 0n,
    hasHedronMinted: false,  // Need to mint hedron first
    endStaker: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  },

  // ============================================================================
  // SCENARIO 3: STAKE_ENDED_HEDRON_MINTED
  // ============================================================================
  // What you'll see:
  //   - Stake Info tab: "Stake is ready to be ended!" message
  //   - End The Stake tab: "Mint Hedron" disabled (already minted)
  //   - End The Stake tab: "End Stake" button enabled (white, ready to click)
  //   - Claim HEX tab: Still disabled (wait until stake is ended)
  //   - Mint tab: Minting disabled
  // What you can do: Click "End Stake" to end it and enter reload phase
  // ============================================================================
  STAKE_ENDED_HEDRON_MINTED: {
    stakeIsActive: true,     // Still active until someone ends it
    stakeEndDay: 1000n,
    stakeStartDay: 631n,
    currentHexDay: 1001n,
    currentPeriod: 3n,
    reloadPhaseEnd: 0n,
    reloadPhaseStart: 0n,
    hasHedronMinted: true,   // Hedron minted, can end stake now
    endStaker: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  },

  // ============================================================================
  // SCENARIO 4: RELOAD_PHASE ⭐ (Most interesting for testing)
  // ============================================================================
  // What you'll see:
  //   - Stake Info tab: "Stake Status: Ended/Not Started"
  //   - End The Stake tab: Shows who ended the stake + transaction
  //   - Claim HEX tab: 💎 Diamond Hands button appears! Can unlock tokens
  //   - Claim HEX tab: "Redeem Your HEX" enabled - burn tokens for HEX
  //   - Claim HEX tab: Reload phase countdown shows 5 days remaining
  //   - Mint tab: 💎 Diamond Hands button appears! Can lock tokens
  //   - Mint tab: "Mint TRIO/BASE/etc" enabled - pledge HEX for tokens
  // What you can do:
  //   ✅ Burn pool tokens to claim HEX
  //   ✅ Pledge HEX to mint pool tokens
  //   ✅ Lock pool tokens in Diamond Hands for next period
  //   ✅ Unlock tokens from Diamond Hands (with penalty if early)
  // ============================================================================
  RELOAD_PHASE: {
    stakeIsActive: false,    // Stake has been ended
    stakeEndDay: 1000n,
    stakeStartDay: 631n,
    currentHexDay: 1005n,    // During reload phase (5 days into 10-day phase)
    currentPeriod: 4n,       // Even period = reload
    reloadPhaseEnd: 1010n,   // Reload ends in 5 days
    reloadPhaseStart: 1001n,
    hasHedronMinted: true,
    endStaker: '0x8dff901b00000000000000000000000000000000' as `0x${string}`,
  },

  // ============================================================================
  // SCENARIO 5: READY_TO_START
  // ============================================================================
  // What you'll see:
  //   - Stake Info tab: "Stake Status: Ended/Not Started"
  //   - End The Stake tab: "Start the Stake" button appears (green)
  //   - Claim HEX tab: 💎 Diamond Hands still visible but locking disabled
  //   - Claim HEX tab: Redeem disabled (reload phase ended)
  //   - Mint tab: 💎 Diamond Hands still visible but locking disabled
  //   - Mint tab: Minting disabled (reload phase ended)
  // What you can do:
  //   ✅ Click "Start the Stake" to begin next stake period
  //   ✅ Unlock Diamond Hands tokens (if any locked)
  // ============================================================================
  READY_TO_START: {
    stakeIsActive: false,
    stakeEndDay: 1000n,
    stakeStartDay: 631n,
    currentHexDay: 1011n,    // Past reload phase end (1 day after)
    currentPeriod: 4n,
    reloadPhaseEnd: 1010n,   // Reload ended
    reloadPhaseStart: 1001n,
    hasHedronMinted: true,
    endStaker: '0x8dff901b00000000000000000000000000000000' as `0x${string}`,
  },
};

// Get scenario config
function getScenarioConfig() {
  return SCENARIOS[CURRENT_SCENARIO];
}

// Test data for each pool
export const TEST_OVERRIDES: Record<string, PoolTestOverrides> = {
  TRIO: {
    ...getScenarioConfig(),
    currentStakePrincipal: 10000000000n, // 100 HEX (8 decimals)
    hexRedemptionRate: 100000000n, // 1:1 rate with 8 decimals
    reloadPhaseDuration: 10n, // 10 days
    stakeLength: 369n, // 369 days
    userBalance: 1268189000000n, // 12,681.89 tokens (8 decimals)
    totalSupply: 10000000000000000n, // 10,000 tokens
    stakeCount: 1n,
    stakeInfo: [
      12345n, // stakeId
      10000000000n, // stakedHearts (100 HEX, 8 decimals)
      5000000000n, // stakeShares
      100, // lockedDay
      369, // stakedDays
      469, // unlockedDay
      false, // isAutoStake
    ],
    teamContractAddress: '0x8d2fe35d00000000000000000000000000000000' as `0x${string}`,
    decimals: 8,
  },
  DECI: {
    ...getScenarioConfig(),
    currentStakePrincipal: 20000000000n,
    hexRedemptionRate: 100000000n,
    reloadPhaseDuration: 10n,
    stakeLength: 369n,
    userBalance: 2000000000n,
    totalSupply: 20000000000000000n,
    stakeCount: 1n,
    stakeInfo: [
      12346n,
      20000000000n,
      10000000000n,
      100,
      369,
      469,
      false,
    ],
    teamContractAddress: '0x8d2fe35d00000000000000000000000000000001' as `0x${string}`,
    decimals: 8,
  },
  LUCKY: {
    ...getScenarioConfig(),
    currentStakePrincipal: 30000000000n,
    hexRedemptionRate: 100000000n,
    reloadPhaseDuration: 10n,
    stakeLength: 369n,
    userBalance: 3000000000n,
    totalSupply: 30000000000000000n,
    stakeCount: 1n,
    stakeInfo: [
      12347n,
      30000000000n,
      15000000000n,
      100,
      369,
      469,
      false,
    ],
    teamContractAddress: '0x8d2fe35d00000000000000000000000000000002' as `0x${string}`,
    decimals: 8,
  },
  BASE: {
    ...getScenarioConfig(),
    currentStakePrincipal: 40000000000n,
    hexRedemptionRate: 100000000n,
    reloadPhaseDuration: 10n,
    stakeLength: 369n,
    userBalance: 4000000000n,
    totalSupply: 40000000000000000n,
    stakeCount: 1n,
    stakeInfo: [
      12348n,
      40000000000n,
      20000000000n,
      100,
      369,
      469,
      false,
    ],
    teamContractAddress: '0x8d2fe35d00000000000000000000000000000003' as `0x${string}`,
    decimals: 8,
  },
  // Support numbered BASE variants (BASE3, BASE4, eBASE3, eBASE4)
  BASE3: {
    ...getScenarioConfig(),
    currentStakePrincipal: 40000000000n,
    hexRedemptionRate: 100000000n,
    reloadPhaseDuration: 10n,
    stakeLength: 369n,
    userBalance: 4000000000n,
    totalSupply: 40000000000000000n,
    stakeCount: 1n,
    stakeInfo: [12348n, 40000000000n, 20000000000n, 100, 369, 469, false],
    teamContractAddress: '0x8d2fe35d00000000000000000000000000000003' as `0x${string}`,
    decimals: 8,
  },
  eBASE3: {
    ...getScenarioConfig(),
    currentStakePrincipal: 40000000000n,
    hexRedemptionRate: 100000000n,
    reloadPhaseDuration: 10n,
    stakeLength: 369n,
    userBalance: 4000000000n,
    totalSupply: 40000000000000000n,
    stakeCount: 1n,
    stakeInfo: [12348n, 40000000000n, 20000000000n, 100, 369, 469, false],
    teamContractAddress: '0x8d2fe35d00000000000000000000000000000003' as `0x${string}`,
    decimals: 8,
  },
  // Support numbered TRIO variants (TRIO2, eTRIO2)
  TRIO2: {
    ...getScenarioConfig(),
    currentStakePrincipal: 10000000000n,
    hexRedemptionRate: 100000000n,
    reloadPhaseDuration: 10n,
    stakeLength: 1111n,
    userBalance: 1268189000000n,
    totalSupply: 10000000000000000n,
    stakeCount: 1n,
    stakeInfo: [12345n, 10000000000n, 5000000000n, 100, 1111, 1211, false],
    teamContractAddress: '0x8d2fe35d00000000000000000000000000000000' as `0x${string}`,
    decimals: 8,
  },
  eTRIO2: {
    ...getScenarioConfig(),
    currentStakePrincipal: 10000000000n,
    hexRedemptionRate: 100000000n,
    reloadPhaseDuration: 10n,
    stakeLength: 1111n,
    userBalance: 1268189000000n,
    totalSupply: 10000000000000000n,
    stakeCount: 1n,
    stakeInfo: [12345n, 10000000000n, 5000000000n, 100, 1111, 1211, false],
    teamContractAddress: '0x8d2fe35d00000000000000000000000000000000' as `0x${string}`,
    decimals: 8,
  },
};

// Helper function to get override value
export function getOverrideValue<T>(
  ticker: string | undefined,
  field: keyof PoolTestOverrides,
  realValue: T
): T {
  if (!TESTING_ON || !ticker) return realValue;
  
  const override = TEST_OVERRIDES[ticker]?.[field];
  return override !== undefined ? (override as T) : realValue;
}

