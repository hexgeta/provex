import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { mainnet, arbitrum } from '@reown/appkit/networks'
import type { AppKitNetwork } from '@reown/appkit/networks'
import { env } from '@/lib/env'

// Get projectId from centralized env validation
export const projectId = env.projectId

// Define PulseChain network
const pulsechain: AppKitNetwork = {
  id: 369,
  name: 'PulseChain',
  nativeCurrency: {
    decimals: 18,
    name: 'Pulse',
    symbol: 'PLS',
  },
  rpcUrls: {
    default: { http: ['https://rpc.pulsechain.com'] },
    public: { http: ['https://rpc.pulsechain.com'] },
  },
  blockExplorers: {
    default: { name: 'PulseScan', url: 'https://scan.pulsechain.com' },
  },
  testnet: false,
}

// PulseChain Testnet
const pulsechainTestnet: AppKitNetwork = {
  id: 943,
  name: 'PulseChain Testnet v4',
  nativeCurrency: {
    decimals: 18,
    name: 'Test Pulse',
    symbol: 'tPLS',
  },
  rpcUrls: {
    default: { http: ['https://rpc.v4.testnet.pulsechain.com'] },
    public: { http: ['https://rpc.v4.testnet.pulsechain.com'] },
  },
  blockExplorers: {
    default: { name: 'PulseScan Testnet', url: 'https://scan.v4.testnet.pulsechain.com' },
  },
  testnet: true,
}

// Local fork networks for testing
const localFork: AppKitNetwork = {
  id: 369,
  name: 'Local Fork (PLS/ETH)',
  nativeCurrency: {
    decimals: 18,
    name: 'Pulse',
    symbol: 'PLS',
  },
  rpcUrls: {
    default: { http: ['http://127.0.0.1:8545'] },
    public: { http: ['http://127.0.0.1:8545'] },
  },
  blockExplorers: {
    default: { name: 'PulseScan', url: 'https://scan.pulsechain.com' },
  },
  testnet: true,
}

export const networks = [pulsechain, mainnet, arbitrum, pulsechainTestnet, localFork] as [AppKitNetwork, ...AppKitNetwork[]]

//Set up the Wagmi Adapter (Config)
export const wagmiAdapter = new WagmiAdapter({
  ssr: true,
  projectId,
  networks
})

export const config = wagmiAdapter.wagmiConfig
