import { Address } from 'viem';

export interface PerpetualPoolConfig {
  name: string;
  ticker: string;
  contractAddress: Address;
  color: string;
  gradientFrom: string;
  gradientTo: string;
  description: string;
}

export const PERPETUAL_POOLS: Record<string, PerpetualPoolConfig> = {
  TRIO: {
    name: 'TRIO',
    ticker: 'TRIO',
    contractAddress: '0xF55cD1e399e1cc3D95303048897a680be3313308',
    color: 'purple',
    gradientFrom: 'from-purple-600',
    gradientTo: 'to-blue-600',
    description: 'TRIO Perpetual Pool',
  },
  DECI: {
    name: 'DECI',
    ticker: 'DECI',
    contractAddress: '0x6b32022693210cd2cfc466b9ac0085de8fc34ea6',
    color: 'green',
    gradientFrom: 'from-green-600',
    gradientTo: 'to-emerald-600',
    description: 'DECI Perpetual Pool',
  },
  LUCKY: {
    name: 'LUCKY',
    ticker: 'LUCKY',
    contractAddress: '0x6b0956258ff7bd7645aa35369b55b61b8e6d6140',
    color: 'yellow',
    gradientFrom: 'from-yellow-600',
    gradientTo: 'to-orange-600',
    description: 'LUCKY Perpetual Pool',
  },
  BASE: {
    name: 'BASE',
    ticker: 'BASE',
    contractAddress: '0xe9f84d418b008888a992ff8c6d22389c2c3504e0',
    color: 'blue',
    gradientFrom: 'from-blue-600',
    gradientTo: 'to-cyan-600',
    description: 'BASE Perpetual Pool',
  },
};

export const POOL_OPTIONS = Object.values(PERPETUAL_POOLS);
export type PoolTicker = keyof typeof PERPETUAL_POOLS;

