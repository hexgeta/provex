import { Address } from 'viem';

// TEAM Contract on PulseChain
export const TEAM_CONTRACT_ADDRESS = '0xb7c9e99da8a857ce576a830a9c19312114d9de02' as Address;

// From the Team contract, get this address by calling STAKE_REWARD_DISTRIBUTION_ADDRESS
export const TEAM_STAKE_REWARD_DISTRIBUTION = '0x...' as Address; // TODO: Get from contract

// Supported reward tokens
export const REWARD_TOKENS = [
  'HEX',
  'BASE',
  'TRIO',
  'LUCKY',
  'DECI',
  'MAXI',
  'HDRN',
  'TEAM',
  'ICSA',
] as const;

export type RewardToken = typeof REWARD_TOKENS[number];

// Token addresses for displaying in UI
export const REWARD_TOKEN_ADDRESSES: Record<RewardToken, Address> = {
  HEX: '0x2b591e99afe9f32eaa6214f7b7629768c40eeb39',
  BASE: '0xe9f84d418b008888a992ff8c6d22389c2c3504e0',
  TRIO: '0xf55cd1e399e1cc3d95303048897a680be3313308',
  LUCKY: '0x6b0956258ff7bd7645aa35369b55b61b8e6d6140',
  DECI: '0x6b32022693210cd2cfc466b9ac0085de8fc34ea6',
  MAXI: '0x0d86eb9f43c57f6ff3bc9e23d8f9d82503f0e84b',
  HDRN: '0x3819f64f282bf135d62168C1e513280dAF905e06',
  TEAM: '0xb7c9e99da8a857ce576a830a9c19312114d9de02',
  ICSA: '0xfc4913214444aF5c715cc9F7b52655e788A569ed',
};
