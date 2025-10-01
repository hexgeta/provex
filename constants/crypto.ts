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
}

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
  a: "0x02dcdd04e3f455d838cd1249292c58f3b79e3c3c",
  dexs: ["0x29d66D5900Eb0d629E1e6946195520065A6c5aeE"],
  ticker: "weWETH",
  decimals: 18,
  name: "Wrapped WETH from Eth",
  origin: [1, "0x0"]
}, {
  chain: 369,
  a: "0xda073388422065fe8d3b5921ec2ae475bae57bed",
  dexs: ["0xe9f84d418b008888a992ff8c6d22389c2c3504e0"],
  ticker: "weBASE",
  decimals: 8,
  name: "Wrapped BASE from Eth",
  origin: [1, "0xe9f84d418b008888a992ff8c6d22389c2c3504e0"],
  supply: 70668766.59912861,
  stakeType: 'rolling',
  launchDate: new Date('2024-10-26'),
  stakePrinciple: 88475347.99948653,
  tokenSupply: 70668766.59912861,
  tshares: 2939.965758095464,
  stakeStartDate: new Date('2024-10-26'),
  stakeEndDate: new Date('2025-10-30'),
  totalStakedDays: 369
}, {
  chain: 369,
  a: "0x0f3c6134f4022d85127476bc4d3787860e5c5569",
  dexs: "0x518b8CE0C7CE74a85774814fBFac7ADCDf702b2C",
  ticker: "weTRIO",
  decimals: 8,
  name: "Wrapped TRIO from Eth",
  origin: [1, "0xf55cd1e399e1cc3d95303048897a680be3313308"],
  supply: 69617911.47775
}, {
  chain: 369,
  a: "0x8924f56df76ca9e7babb53489d7bef4fb7caff19",
  dexs: ["0x6b0956258ff7bd7645aa35369b55b61b8e6d6140"],
  ticker: "weLUCKY",
  decimals: 8,
  name: "Wrapped LUCKY from Eth",
  origin: [1, "0x6b0956258ff7bd7645aa35369b55b61b8e6d6140"],
  supply: 74985501.67671512
}, {
  chain: 369,
  a: "0x189a3ca3cc1337e85c7bc0a43b8d3457fd5aae89",
  dexs: "0x39e87e2baa67f3c7f1dd58f58014f23f97e3265e",
  ticker: "weDECI",
  decimals: 8,
  name: "Wrapped DECI from Eth",
  origin: [1, "0x6b32022693210cd2cfc466b9ac0085de8fc34ea6"],
  supply: 565991987.7294711
}, {
  chain: 369,
  a: "0x352511c9bc5d47dbc122883ed9353e987d10a3ba",
  dexs: "0x90b629cbbefc1efcae0b4cb027a51f0e0c3dcd76",
  ticker: "weMAXI",
  decimals: 8,
  name: "Wrapped MAXI from Eth",
  origin: [1, "0x0d86eb9f43c57f6ff3bc9e23d8f9d82503f0e84b"],
  supply: 274546065
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
  stakeEndDate: new Date('2037-07-16'),
  totalStakedDays: 5555,
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
  stakeEndDate: new Date('2032-11-09'),
  totalStakedDays: 3696,
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
  stakeEndDate: new Date('2029-09-25'),
  totalStakedDays: 2555,
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
  stakeEndDate: new Date('2025-10-12'),
  totalStakedDays: 1111,
}, {
  chain: 369,
  a: "0xe9f84d418b008888a992ff8c6d22389c2c3504e0",
  dexs: "0xb39490b46d02146f59e80c6061bb3e56b824d672",
  ticker: "BASE",
  decimals: 8,
  name: "BASE on PulseChain",
  supply: 54165743.289,
  launchDate: new Date('2024-09-23'),
  stakePrinciple: 67444991.8094404,
  tokenSupply: 54165743.289,
  tshares: 2232.801612927137,
  stakeStartDate: new Date('2024-09-23'),
  stakeEndDate: new Date('2025-10-27'),
  totalStakedDays: 369
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


