import { Address } from 'viem';

// Master toggle - set to true to use test overrides instead of real contract data
export const TESTING_ON = false;

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
}

// Test data for each pool
export const TEST_OVERRIDES: Record<string, PoolTestOverrides> = {
  TRIO: {
    stakeIsActive: false,
    stakeEndDay: 1000n,
    stakeStartDay: 631n,
    currentHexDay: 1001n,
    currentPeriod: 5n,
    currentStakePrincipal: 100000000000n, // 100 HEX
    hexRedemptionRate: 1000000000n, // 1:1 rate with 9 decimals
    reloadPhaseEnd: 1728691200n, // Oct 12, 2024
    reloadPhaseStart: 1728604800n,
    reloadPhaseDuration: 86400n, // 1 day in seconds
    stakeLength: 369n, // 369 days
    userBalance: 1000000000000000000n, // 1 token (18 decimals)
    totalSupply: 10000000000000000000000n, // 10,000 tokens
    stakeCount: 1n,
    stakeInfo: [
      12345n, // stakeId
      100000000000n, // stakedHearts (100 HEX)
      50000000000n, // stakeShares
      100, // lockedDay
      369, // stakedDays
      469, // unlockedDay
      false, // isAutoStake
    ],
    endStaker: '0x8dff901b00000000000000000000000000000000' as `0x${string}`,
    teamContractAddress: '0x8d2fe35d00000000000000000000000000000000' as `0x${string}`,
    decimals: 18,
  },
  DECI: {
    stakeIsActive: true,
    stakeEndDay: 1000n,
    stakeStartDay: 631n,
    currentHexDay: 1001n,
    currentPeriod: 5n,
    currentStakePrincipal: 200000000000n, // 200 HEX
    hexRedemptionRate: 1000000000n,
    reloadPhaseEnd: 1728691200n,
    reloadPhaseStart: 1728604800n,
    reloadPhaseDuration: 86400n,
    stakeLength: 369n,
    userBalance: 2000000000000000000n, // 2 tokens
    totalSupply: 20000000000000000000000n, // 20,000 tokens
    stakeCount: 1n,
    stakeInfo: [
      12346n,
      200000000000n, // 200 HEX
      100000000000n,
      100,
      369,
      469,
      false,
    ],
    endStaker: '0x1234567890123456789012345678901234567890' as `0x${string}`,
    teamContractAddress: '0x8d2fe35d00000000000000000000000000000001' as `0x${string}`,
    decimals: 18,
  },
  LUCKY: {
    stakeIsActive: false,
    stakeEndDay: 1000n,
    stakeStartDay: 631n,
    currentHexDay: 1001n,
    currentPeriod: 5n,
    currentStakePrincipal: 300000000000n, // 300 HEX
    hexRedemptionRate: 1000000000n,
    reloadPhaseEnd: 1728691200n,
    reloadPhaseStart: 1728604800n,
    reloadPhaseDuration: 86400n,
    stakeLength: 369n,
    userBalance: 3000000000000000000n, // 3 tokens
    totalSupply: 30000000000000000000000n, // 30,000 tokens
    stakeCount: 1n,
    stakeInfo: [
      12347n,
      300000000000n, // 300 HEX
      150000000000n,
      100,
      369,
      469,
      false,
    ],
    endStaker: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as `0x${string}`,
    teamContractAddress: '0x8d2fe35d00000000000000000000000000000002' as `0x${string}`,
    decimals: 18,
  },
  BASE: {
    stakeIsActive: false,
    stakeEndDay: 1000n,
    stakeStartDay: 631n,
    currentHexDay: 1001n,
    currentPeriod: 5n,
    currentStakePrincipal: 400000000000n, // 400 HEX
    hexRedemptionRate: 1000000000n,
    reloadPhaseEnd: 1728691200n,
    reloadPhaseStart: 1728604800n,
    reloadPhaseDuration: 86400n,
    stakeLength: 369n,
    userBalance: 4000000000000000000n, // 4 tokens
    totalSupply: 40000000000000000000000n, // 40,000 tokens
    stakeCount: 1n,
    stakeInfo: [
      12348n,
      400000000000n, // 400 HEX
      200000000000n,
      100,
      369,
      469,
      false,
    ],
    endStaker: '0x9999999999999999999999999999999999999999' as `0x${string}`,
    teamContractAddress: '0x8d2fe35d00000000000000000000000000000003' as `0x${string}`,
    decimals: 18,
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

