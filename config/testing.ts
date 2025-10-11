/**
 * Testing Configuration
 * 
 * Toggle TESTING_MODE to enable/disable local fork testing
 * When enabled:
 * - Shows "Local Fork" option in chain switcher
 * - Maps chain 31337 to use chain 369 (PulseChain) assets/contracts
 */

// 🔧 TOGGLE THIS TO ENABLE/DISABLE TESTING MODE
export const TESTING_MODE = false;

// Local fork chain configuration
export const LOCAL_FORK_CHAIN_ID = 31337;
export const PULSECHAIN_CHAIN_ID = 369;
export const ETHEREUM_CHAIN_ID = 1;

/**
 * Normalizes chain ID for testing
 * When testing mode is on, maps local fork (31337) to PulseChain (369)
 * Otherwise returns the original chain ID
 */
export function normalizeChainId(chainId: number | undefined): number | undefined {
  if (!TESTING_MODE) return chainId;
  if (chainId === LOCAL_FORK_CHAIN_ID) return PULSECHAIN_CHAIN_ID;
  return chainId;
}

/**
 * Gets the available chains for the chain switcher
 * Includes local fork when testing mode is enabled
 */
export function getAvailableChains() {
  const chains = [
    {
      id: PULSECHAIN_CHAIN_ID,
      name: 'PulseChain',
      icon: '/coin-logos/PLS-white.svg',
    },
    {
      id: ETHEREUM_CHAIN_ID,
      name: 'Ethereum',
      icon: '/coin-logos/ETH-white.svg',
    },
  ];

  // Add local fork option when testing mode is enabled
  if (TESTING_MODE) {
    chains.push({
      id: LOCAL_FORK_CHAIN_ID,
      name: 'Local Fork',
      icon: '/coin-logos/PLS-white.svg',
    });
  }

  return chains;
}

/**
 * Gets the available networks for AppKit configuration
 * Includes local fork network when testing mode is enabled
 */
export function shouldIncludeLocalFork(): boolean {
  return TESTING_MODE;
}

