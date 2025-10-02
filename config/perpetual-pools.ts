import { Address } from 'viem';

export interface PerpetualPoolConfig {
  name: string;
  ticker: string;
  contractAddress: Address;
  color: string;
  gradientFrom: string;
  gradientTo: string;
  description: string;
  deadlineUTC: string; // ISO string format
}

// TEST OVERRIDES - Set to true to simulate ended stake / claim period
export const TEST_OVERRIDES = {
  TRIO_STAKE_ENDED: false,
  DECI_STAKE_ENDED: false,
  LUCKY_STAKE_ENDED: false,
  BASE_STAKE_ENDED: false,
};

export const PERPETUAL_POOLS: Record<string, PerpetualPoolConfig> = {
  TRIO: {
    name: 'TRIO',
    ticker: 'TRIO',
    contractAddress: '0xF55cD1e399e1cc3D95303048897a680be3313308',
    color: '#FFFFFF', // white from chart
    gradientFrom: 'from-white',
    gradientTo: 'to-gray-200',
    description: 'TRIO Perpetual Pool',
    deadlineUTC: '2025-10-12T00:00:00Z',
  },
  DECI: {
    name: 'DECI',
    ticker: 'DECI',
    contractAddress: '0x6b32022693210cd2cfc466b9ac0085de8fc34ea6',
    color: '#C24C35', // rust/red from chart
    gradientFrom: 'from-[#C24C35]',
    gradientTo: 'to-red-700',
    description: 'DECI Perpetual Pool',
    deadlineUTC: '2025-10-12T00:00:00Z',
  },
  LUCKY: {
    name: 'LUCKY',
    ticker: 'LUCKY',
    contractAddress: '0x6b0956258ff7bd7645aa35369b55b61b8e6d6140',
    color: '#416F22', // green from chart
    gradientFrom: 'from-[#416F22]',
    gradientTo: 'to-green-800',
    description: 'LUCKY Perpetual Pool',
    deadlineUTC: '2025-10-12T00:00:00Z',
  },
  BASE: {
    name: 'BASE',
    ticker: 'BASE',
    contractAddress: '0xe9f84d418b008888a992ff8c6d22389c2c3504e0',
    color: '#F09B1A', // orange/gold from chart
    gradientFrom: 'from-[#F09B1A]',
    gradientTo: 'to-orange-600',
    description: 'BASE Perpetual Pool',
    deadlineUTC: '2025-10-12T00:00:00Z',
  },
};

// Ordered pool options: DECI, LUCKY, TRIO, BASE
export const POOL_OPTIONS = [
  PERPETUAL_POOLS.DECI,
  PERPETUAL_POOLS.LUCKY,
  PERPETUAL_POOLS.TRIO,
  PERPETUAL_POOLS.BASE,
];
export type PoolTicker = keyof typeof PERPETUAL_POOLS;

