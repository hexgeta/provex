import { PairData } from '@/types/crypto'

export interface TokenConfig {
  chain: number
  a: string
  dexs: string | string[]
  ticker: string
  decimals: number
  name: string
  origin?: [number, string]
  supply?: number
  type?: "lp" | "token"
  platform?: string
  hardcodedPrice?: number
  stakeType?: 'rolling' | 'fixed'
  launchDate?: Date
  stakePrinciple?: number
  tokenSupply?: number
  tshares?: number
  stakeStartDate?: Date | string
  stakeEndDate?: Date | string
  totalStakedDays?: number
  color?: string
  gradientFrom?: string
  gradientTo?: string
  description?: string
  pair?: {
    pairAddress: string
    chain: string
  }
}

// NOTE: stakeEndDate values are HEX Day + 2 days for practical conversion
// This accounts for when stakes can actually end in practice
export const TOKEN_CONSTANTS = [{
  chain: 369,
  a: "0x000000000000000000000000000000000000dEaD",
  dexs: "0xe56043671df55de5cdf8459710433c10324de0ae",
  ticker: "PLS",
  decimals: 18,
  name: "Pulse"
}, {
  chain: 369,
  a: "0x95b303987a60c71504d99aa1b13b4da07b0790ab",
  dexs: "0x1b45b9148791d3a104184cd5dfe5ce57193a3ee9",
  ticker: "PLSX",
  decimals: 18,
  name: "PulseX"
}, {
  chain: 369,
  a: "0x2b591e99afe9f32eaa6214f7b7629768c40eeb39",
  dexs: "0xf1f4ee610b2babb05c635f726ef8b0c568c8dc65",
  ticker: "HEX",
    decimals: 8,
  name: "HEX on Pls"
}, {
  chain: 369,
  a: "0x2fa878ab3f87cc1c9737fc071108f904c0b0c95d",
  dexs: "0xf808bb6265e9ca27002c0a04562bf50d4fe37eaa",
  ticker: "INC",
  decimals: 18,
  name: "Incentive"
}, {
  chain: 369,
  a: "0xa1077a294dde1b09bb078844df40758a5d0f9a27",
  dexs: "0xe56043671df55de5cdf8459710433c10324de0ae",
  ticker: "WPLS",
  decimals: 18,
  name: "Wrapped PLS, from here these arent whitelisted",
  origin: [369, "0x0"]
}, {
  chain: 369,
  a: "0x0d86eb9f43c57f6ff3bc9e23d8f9d82503f0e84b",
  dexs: "0xbfb22cc394c53c14dc8a5840a246dfdd2f7b2507",
  ticker: "MAXI",
  decimals: 8,
  name: "Maxi on PulseChain",
  supply: 274546065,
  stakeType: 'fixed',
  launchDate: new Date('2022-05-01'),
  tshares: 42104.43801001704,
  stakePrinciple: 294323603.76679647,
  tokenSupply: 274546065,
  stakeStartDate: new Date('2022-05-01'),
  stakeEndDate: '2037-07-17T00:00:00.000Z', // HEX Day 6435 + 2 days for practical conversion
  totalStakedDays: 5555,
  color: '#3991ED',
  gradientFrom: 'from-[#3991ED]',
  gradientTo: 'to-blue-700',
  description: 'MAXI Fixed Stake Pool',
}, {
  chain: 369,
  a: "0x6b32022693210cd2cfc466b9ac0085de8fc34ea6",
  dexs: "0x969af590981bb9d19ff38638fa3bd88aed13603a",
  ticker: "DECI",
  decimals: 8,
  name: "DECI on PulseChain",
  supply: 565991987.7294711,
  stakeType: 'rolling',
  launchDate: new Date('2022-09-27'),
  stakePrinciple: 565991987.7294711,
  tokenSupply: 565991987.7294711,
  tshares: 71337.83,
  stakeStartDate: new Date('2022-09-27'),
  stakeEndDate: '2032-11-10T00:00:00.000Z', // HEX Day 4725 + 2 days for practical conversion
  totalStakedDays: 3696,
  color: '#C24C35',
  gradientFrom: 'from-[#C24C35]',
  gradientTo: 'to-red-700',
  description: 'DECI Perpetual Pool',
  pair: {
      pairAddress: '0x969af590981bb9d19ff38638fa3bd88aed13603a',
      chain: 'pulsechain'
    }
}, {
  chain: 369,
  a: "0x6b0956258ff7bd7645aa35369b55b61b8e6d6140",
  dexs: "0x52d4b3f479537a15d0b37b6cdbdb2634cc78525e",
  ticker: "LUCKY",
  decimals: 8,
  name: "LUCKY on PulseChain",
  supply: 74985501.67671512,
  stakeType: 'rolling',
  launchDate: new Date('2022-09-27'),
  stakePrinciple: 74985501.67671512,
  tokenSupply: 74985501.67671512,
  tshares: 7524.68,
  stakeStartDate: new Date('2022-09-27'),
  stakeEndDate: '2029-09-26T00:00:00.000Z', // HEX Day 3584 + 2 days for practical conversion
  totalStakedDays: 2555,
  color: '#416F22',
  gradientFrom: 'from-[#416F22]',
  gradientTo: 'to-green-800',
  description: 'LUCKY Perpetual Pool',
  pair: {
      pairAddress: '0x52d4b3f479537a15d0b37b6cdbdb2634cc78525e',
      chain: 'pulsechain'
    }
}, {
  chain: 369,
  a: "0xf55cd1e399e1cc3d95303048897a680be3313308",
  dexs: "0x0b0f8f6c86c506b70e2a488a451e5ea7995d05c9",
  ticker: "TRIO",
  decimals: 8,
  name: "TRIO on PulseChain",
  supply: 69617911.47775,
  stakeType: 'rolling',
  launchDate: new Date('2022-09-27'),
  stakePrinciple: 69617911.47775,
  tokenSupply: 69617911.47775,
  tshares: 4698.32,
  stakeStartDate: new Date('2022-09-27'),
  stakeEndDate: '2025-10-13T00:00:00.000Z', // HEX Day 2140 + 2 days for practical conversion
  totalStakedDays: 1111,
  color: '#FFFFFF',
  gradientFrom: 'from-white',
  gradientTo: 'to-gray-200',
  description: 'TRIO Perpetual Pool',
}, {
  chain: 369,
  a: "0xe9f84d418b008888a992ff8c6d22389c2c3504e0",
  dexs: "0xb39490b46d02146f59e80c6061bb3e56b824d672",
  ticker: "BASE3",
  decimals: 8,
  name: "BASE on PulseChain",
  supply: 54165743.289,
  stakeType: 'rolling',
  launchDate: new Date('2024-09-23'),
  stakePrinciple: 67444991.8094404,
  tokenSupply: 54165743.289,
  tshares: 2232.801612927137,
  stakeStartDate: new Date('2024-09-23'),
  stakeEndDate: '2025-10-27T00:00:00.000Z', // HEX Day 2154 + 2 days for practical conversion
  totalStakedDays: 369,
  color: '#F09B1A',
  gradientFrom: 'from-[#F09B1A]',
  gradientTo: 'to-orange-600',
  description: 'BASE Perpetual Pool'
}, {
  chain: 369,
  a: "0xe9f84d418b008888a992ff8c6d22389c2c3504e0",
  dexs: "0xb39490b46d02146f59e80c6061bb3e56b824d672",
  ticker: "BASE1",
  decimals: 8,
  name: "BASE Cycle 1 on PulseChain",
  supply: 100033101,
  stakeType: 'rolling',
  launchDate: new Date('2022-09-27'),
  stakePrinciple: 100033101,
  tokenSupply: 100033101,
  tshares: 5107.53,
  stakeStartDate: new Date('2022-09-27'),
  stakeEndDate: new Date('2023-10-01'),
  totalStakedDays: 369,
  pair: {
    pairAddress: '0xb39490b46d02146f59e80c6061bb3e56b824d672',
    chain: 'pulsechain'
  }
}, {
  chain: 369,
  a: "0xe9f84d418b008888a992ff8c6d22389c2c3504e0",
  dexs: "0xb39490b46d02146f59e80c6061bb3e56b824d672",
  ticker: "BASE2",
  decimals: 8,
  name: "BASE Cycle 2 on PulseChain",
  supply: 97197332,
  stakeType: 'rolling',
  launchDate: new Date('2023-10-10'),
  stakePrinciple: 109163369.06540806,
  tokenSupply: 97197332,
  tshares: 4532.11,
  stakeStartDate: new Date('2023-10-10'),
  stakeEndDate: new Date('2024-10-13'),
  totalStakedDays: 369,
  pair: {
    pairAddress: '0xb39490b46d02146f59e80c6061bb3e56b824d672',
    chain: 'pulsechain'
  }
}, {
  chain: 1,
  a: "0xe9f84d418b008888a992ff8c6d22389c2c3504e0",
  dexs: "0x7b33fe2C4f48da97dc2BAa1f32f869c50Dc1dF85",
  ticker: "eBASE1",
  decimals: 8,
  name: "BASE Cycle 1 on Ethereum",
  supply: 100033101,
  stakeType: 'rolling',
  launchDate: new Date('2022-09-27'),
  stakePrinciple: 100033101,
  tokenSupply: 100033101,
  tshares: 5107.53,
  stakeStartDate: new Date('2022-09-27'),
  stakeEndDate: new Date('2023-10-01'),
  totalStakedDays: 369,
  pair: {
    pairAddress: '0x7b33fe2C4f48da97dc2BAa1f32f869c50Dc1dF85',
    chain: 'ethereum'
  }
}, {
  chain: 1,
  a: "0xe9f84d418b008888a992ff8c6d22389c2c3504e0",
  dexs: "0x7b33fe2C4f48da97dc2BAa1f32f869c50Dc1dF85",
  ticker: "eBASE2",
  decimals: 8,
  name: "BASE Cycle 2 on Ethereum",
  supply: 84316269,
  stakeType: 'rolling',
  launchDate: new Date('2023-10-10'),
  stakePrinciple: 94725486.32257561,
  tokenSupply: 84316269,
  tshares: 3917.41,
  stakeStartDate: new Date('2023-10-10'),
  stakeEndDate: new Date('2024-10-13'),
  totalStakedDays: 369,
  pair: {
    pairAddress: '0x7b33fe2C4f48da97dc2BAa1f32f869c50Dc1dF85',
    chain: 'ethereum'
  }
}, {
  chain: 1,
  a: "0xe9f84d418b008888a992ff8c6d22389c2c3504e0",
  dexs: "0x7b33fe2C4f48da97dc2BAa1f32f869c50Dc1dF85",
  ticker: "eBASE3",
  decimals: 8,
  name: "BASE Cycle 3 on Ethereum",
  supply: 70668766.59912861,
  stakeType: 'rolling',
  launchDate: new Date('2024-10-26'),
  stakePrinciple: 88475347.99948653,
  tokenSupply: 70668766.59912861,
  tshares: 2939.965758095464,
  stakeStartDate: new Date('2024-10-26'),
  stakeEndDate: '2025-10-30T00:00:00.000Z', // HEX Day 2157 + 2 days for practical conversion
  totalStakedDays: 369,
  color: '#F09B1A',
  gradientFrom: 'from-[#F09B1A]',
  gradientTo: 'to-orange-600',
  description: 'BASE Perpetual Pool',
  pair: {
    pairAddress: '0x7b33fe2C4f48da97dc2BAa1f32f869c50Dc1dF85',
    chain: 'ethereum'
  }
}, {
  chain: 1,
  a: "0xf55cd1e399e1cc3d95303048897a680be3313308",
  dexs: "0xda72b9e219d87ea31b4a1929640d9e960362470d",
  ticker: "eTRIO",
  decimals: 8,
  name: "TRIO on Ethereum",
  supply: 69617911.47775,
  stakeType: 'rolling',
  launchDate: new Date('2022-09-27'),
  stakePrinciple: 69617911.47775,
  tokenSupply: 69617911.47775,
  tshares: 4698.32,
  stakeStartDate: new Date('2022-09-27'),
  stakeEndDate: '2025-10-13T00:00:00.000Z', // HEX Day 2140 + 2 days for practical conversion
  totalStakedDays: 1111,
  color: '#FFFFFF',
  gradientFrom: 'from-white',
  gradientTo: 'to-gray-200',
  description: 'TRIO Perpetual Pool',
  pair: {
    pairAddress: '0xda72b9e219d87ea31b4a1929640d9e960362470d',
    chain: 'ethereum'
  }
}, {
  chain: 1,
  a: "0x6b0956258ff7bd7645aa35369b55b61b8e6d6140",
  dexs: "0x7327325e5F41d4c1922a9DFc87d8a3b3F1ae5C1F",
  ticker: "eLUCKY",
  decimals: 8,
  name: "LUCKY on Ethereum",
  supply: 74985501.67671512,
  stakeType: 'rolling',
  launchDate: new Date('2022-09-27'),
  stakePrinciple: 74985501.67671512,
  tokenSupply: 74985501.67671512,
  tshares: 7524.68,
  stakeStartDate: new Date('2022-09-27'),
  stakeEndDate: '2029-09-26T00:00:00.000Z', // HEX Day 3584 + 2 days for practical conversion
  totalStakedDays: 2555,
  color: '#416F22',
  gradientFrom: 'from-[#416F22]',
  gradientTo: 'to-green-800',
  description: 'LUCKY Perpetual Pool',
  pair: {
    pairAddress: '0x7327325e5F41d4c1922a9DFc87d8a3b3F1ae5C1F',
    chain: 'ethereum'
  }
}, {
  chain: 1,
  a: "0x6b32022693210cd2cfc466b9ac0085de8fc34ea6",
  dexs: "0x39e87e2baa67f3c7f1dd58f58014f23f97e3265e",
  ticker: "eDECI",
  decimals: 8,
  name: "DECI on Ethereum",
  supply: 565991987.7294711,
  stakeType: 'rolling',
  launchDate: new Date('2022-09-27'),
  stakePrinciple: 565991987.7294711,
  tokenSupply: 565991987.7294711,
  tshares: 71337.83,
  stakeStartDate: new Date('2022-09-27'),
  stakeEndDate: '2032-11-10T00:00:00.000Z', // HEX Day 4725 + 2 days for practical conversion
  totalStakedDays: 3696,
  color: '#C24C35',
  gradientFrom: 'from-[#C24C35]',
  gradientTo: 'to-red-700',
  description: 'DECI Perpetual Pool',
  pair: {
    pairAddress: '0x39e87e2baa67f3c7f1dd58f58014f23f97e3265e',
    chain: 'ethereum'
  }
}, {
  chain: 1,
  a: "0x0d86eb9f43c57f6ff3bc9e23d8f9d82503f0e84b",
  dexs: "0xFD309d27B4cb4F5C869ee53E5D0fCc5654d3bb01",
  ticker: "eMAXI",
  decimals: 8,
  name: "MAXI on Ethereum",
  supply: 274546065,
  stakeType: 'fixed',
  launchDate: new Date('2022-05-01'),
  tshares: 42104.43801001704,
  stakePrinciple: 294323603.76679647,
  tokenSupply: 274546065,
  stakeStartDate: new Date('2022-05-01'),
  stakeEndDate: '2037-07-17T00:00:00.000Z', // HEX Day 6435 + 2 days for practical conversion
  totalStakedDays: 5555,
  color: '#3991ED',
  gradientFrom: 'from-[#3991ED]',
  gradientTo: 'to-blue-700',
  description: 'MAXI Fixed Stake Pool',
  pair: {
    pairAddress: '0xFD309d27B4cb4F5C869ee53E5D0fCc5654d3bb01',
    chain: 'ethereum'
  }
}, {
  chain: 369,
  a: "0xb7c9e99da8a857ce576a830a9c19312114d9de02",
  dexs: "0x55b4387ff2cf168801ec64ca8221e035fd07b81d",
  ticker: "TEAM",
  decimals: 8,
  name: "Team on PulseChain"
}, {
  chain: 369,
  a: "0x4581af35199bbde87a89941220e04e27ce4b0099",
  dexs: "0x70966CcB20C10Ae326D6368A107C80fb825F3028",
  ticker: "PARTY",
  decimals: 18,
  name: "Pool Party on PulseChain"
}
];

export const API_ENDPOINTS = {
  historic_pulsechain: 'https://hexdailystats.com/fulldatapulsechain',
  historic_ethereum: 'https://hexdailystats.com/fulldata',
  livedata: 'https://hexdailystats.com/livedata'
}

// LP Token detection is now handled via the `type: "lp"` field in TOKEN_CONSTANTS
// To add a new LP token:
// 1. Add the token to TOKEN_CONSTANTS with type: "lp" and platform: "PLSX V2" 
// 2. The Portfolio component will automatically detect and price it

// ===== PERPETUAL POOL CONFIGURATION =====

export interface PerpetualPoolConfig {
  name: string;
  ticker: string;
  contractAddress: string;
  color: string;
  gradientFrom: string;
  gradientTo: string;
  description: string;
  deadlineUTC: string;
  stakeLengthDays: number;
}

// Derive PERPETUAL_POOLS from TOKEN_CONSTANTS to ensure single source of truth
// Note: Automatically includes all numbered variants (BASE3, BASE4, TRIO2, eTRIO2, etc.)
const perpetualPoolTokens = TOKEN_CONSTANTS.filter(token => {
  // Check if token has required perpetual pool fields
  if (!token.color || !token.totalStakedDays) return false;
  
  // Extract base ticker name (remove 'e' prefix and numbers)
  const baseTicker = token.ticker.replace(/^e/, '').replace(/\d+$/, '');
  
  // Include MAXI, DECI, LUCKY, and any BASE/TRIO variant
  return ['MAXI', 'DECI', 'LUCKY', 'BASE', 'TRIO'].includes(baseTicker);
});

export const PERPETUAL_POOLS: Record<string, PerpetualPoolConfig> = perpetualPoolTokens.reduce((acc, token) => {
  const endDate = token.stakeEndDate as string | Date;
  const deadlineUTC = typeof endDate === 'string' ? endDate : (endDate as Date).toISOString();
  
  acc[token.ticker] = {
    name: token.name,
    ticker: token.ticker,
    contractAddress: token.a,
    color: token.color!,
    gradientFrom: token.gradientFrom!,
    gradientTo: token.gradientTo!,
    description: token.description!,
    deadlineUTC,
    stakeLengthDays: token.totalStakedDays!,
  };
  return acc;
}, {} as Record<string, PerpetualPoolConfig>);

// Helper function to get the highest numbered pool for a given ticker prefix
export function getLatestPoolByPrefix(tickerPrefix: string, chainId: number | undefined): PerpetualPoolConfig | undefined {
  const isEthereum = chainId === 1;
  
  // Build the search prefix (e.g., "BASE" or "eBASE" or "TRIO" or "eTRIO")
  const searchPrefix = isEthereum && !tickerPrefix.startsWith('e') ? `e${tickerPrefix}` : tickerPrefix;
  
  // Find all pools that match this prefix
  const matchingPools = TOKEN_CONSTANTS.filter(token => {
    const matchesPrefix = token.ticker.startsWith(searchPrefix);
    const matchesChain = token.chain === (isEthereum ? 1 : 369);
    const hasRequiredFields = token.color && token.totalStakedDays;
    return matchesPrefix && matchesChain && hasRequiredFields;
  });
  
  if (matchingPools.length === 0) return undefined;
  
  // Extract the number from the ticker (e.g., "BASE3" -> 3, "eBASE2" -> 2)
  // If no number, treat as 0 (for backwards compatibility with "TRIO" without number)
  const poolsWithNumbers = matchingPools.map(token => {
    const numberMatch = token.ticker.match(/\d+$/);
    const number = numberMatch ? parseInt(numberMatch[0], 10) : 0;
    return { token, number };
  });
  
  // Sort by number descending and get the highest
  poolsWithNumbers.sort((a, b) => b.number - a.number);
  const latestToken = poolsWithNumbers[0].token;
  
  // Convert to PerpetualPoolConfig format
  const endDate = latestToken.stakeEndDate as string | Date;
  const deadlineUTC = typeof endDate === 'string' ? endDate : (endDate as Date).toISOString();
  
  return {
    name: latestToken.name,
    ticker: latestToken.ticker,
    contractAddress: latestToken.a,
    color: latestToken.color!,
    gradientFrom: latestToken.gradientFrom!,
    gradientTo: latestToken.gradientTo!,
    description: latestToken.description!,
    deadlineUTC,
    stakeLengthDays: latestToken.totalStakedDays!,
  };
}

// Helper function to get the correct pool options based on current chain
export function getPoolOptionsForChain(chainId: number | undefined) {
  // Default to PulseChain (369) if chainId is undefined
  const defaultChainId = chainId || 369;
  
  // Dynamically find the latest version of each pool
  const latestMaxi = getLatestPoolByPrefix('MAXI', defaultChainId);
  const latestDeci = getLatestPoolByPrefix('DECI', defaultChainId);
  const latestLucky = getLatestPoolByPrefix('LUCKY', defaultChainId);
  const latestTrio = getLatestPoolByPrefix('TRIO', defaultChainId);
  const latestBase = getLatestPoolByPrefix('BASE', defaultChainId);
  
  // Fallbacks in case getLatestPoolByPrefix fails (should never happen with the metadata we added)
  const maxiFallback = defaultChainId === 1 ? (PERPETUAL_POOLS.eMAXI || PERPETUAL_POOLS.MAXI) : PERPETUAL_POOLS.MAXI;
  const deciFallback = defaultChainId === 1 ? (PERPETUAL_POOLS.eDECI || PERPETUAL_POOLS.DECI) : PERPETUAL_POOLS.DECI;
  const luckyFallback = defaultChainId === 1 ? (PERPETUAL_POOLS.eLUCKY || PERPETUAL_POOLS.LUCKY) : PERPETUAL_POOLS.LUCKY;
  const trioFallback = defaultChainId === 1 ? (PERPETUAL_POOLS.eTRIO || PERPETUAL_POOLS.TRIO) : PERPETUAL_POOLS.TRIO;
  const baseFallback = defaultChainId === 1 ? (PERPETUAL_POOLS.eBASE3 || PERPETUAL_POOLS.BASE3) : PERPETUAL_POOLS.BASE3;
  
  return [
    latestMaxi || maxiFallback,
    latestDeci || deciFallback,
    latestLucky || luckyFallback,
    latestTrio || trioFallback,
    latestBase || baseFallback,
  ].filter(Boolean); // Remove any undefined values
}

// Default pool options: MAXI, DECI, LUCKY, TRIO, BASE3 (PulseChain)
export const POOL_OPTIONS = [
  PERPETUAL_POOLS.MAXI,
  PERPETUAL_POOLS.DECI,
  PERPETUAL_POOLS.LUCKY,
  PERPETUAL_POOLS.TRIO,
  PERPETUAL_POOLS.BASE3,
];

export type PoolTicker = keyof typeof PERPETUAL_POOLS;


