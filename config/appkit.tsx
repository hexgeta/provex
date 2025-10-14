import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { mainnet, arbitrum } from '@reown/appkit/networks'
import type { AppKitNetwork } from '@reown/appkit/networks'
import { env } from '@/lib/env'
import { shouldIncludeLocalFork } from '@/config/testing'

// Get projectId from centralized env validation
export const projectId = env.projectId

// Validate projectId is available
if (!projectId) {
  console.error('❌ NEXT_PUBLIC_PROJECT_ID is not set. WalletConnect will not work properly.')
}

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

// Local Fork (Hardhat)
const localFork: AppKitNetwork = {
  id: 31337,
  name: 'Local Fork',
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
    default: { name: 'Local', url: 'http://localhost:8545' },
  },
  testnet: true,
}

export const networks = shouldIncludeLocalFork() 
  ? [pulsechain, mainnet, localFork] as [AppKitNetwork, ...AppKitNetwork[]]
  : [pulsechain, mainnet] as [AppKitNetwork, ...AppKitNetwork[]]

//Set up the Wagmi Adapter (Config)
export const wagmiAdapter = new WagmiAdapter({
  ssr: true,
  projectId,
  networks
})

export const config = wagmiAdapter.wagmiConfig
