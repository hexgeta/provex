'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAccount } from 'wagmi';
import { PERPETUAL_POOLS, PerpetualPoolConfig, PoolTicker, getPoolOptionsForChain, getLatestPoolByPrefix } from '@/config/perpetual-pools';
import { normalizeChainId } from '@/config/testing';

interface PoolContextType {
  selectedPool: PerpetualPoolConfig;
  selectedTicker: PoolTicker;
  setSelectedTicker: (ticker: PoolTicker) => void;
}

const PoolContext = createContext<PoolContextType | undefined>(undefined);

export { PoolContext };

export function PoolProvider({ children }: { children: ReactNode }) {
  const { chain } = useAccount();
  const [selectedTicker, setSelectedTicker] = useState<PoolTicker>('MAXI'); // Default to MAXI
  const [hasAutoSelected, setHasAutoSelected] = useState(false);
  const [lastChainId, setLastChainId] = useState<number | undefined>(undefined);

  // Normalize chain ID for testing (31337 -> 369)
  const normalizedChainId = normalizeChainId(chain?.id);

  // Auto-select pool ending soonest using hardcoded deadlineUTC values
  useEffect(() => {
    if (hasAutoSelected) return;
    
    const poolOptions = getPoolOptionsForChain(normalizedChainId).filter(Boolean);
    if (poolOptions.length === 0) return; // No pools available yet
    
    const pools = poolOptions
      .filter(pool => pool && pool.ticker && pool.deadlineUTC)
      .map(pool => ({
        ticker: pool.ticker as PoolTicker,
        deadline: new Date(pool.deadlineUTC).getTime()
      }));

    if (pools.length === 0) return; // No valid pools
    
    // Find pool with earliest deadline (ends soonest)
    const soonestPool = pools.reduce((prev, curr) => 
      curr.deadline < prev.deadline ? curr : prev
    );

    setSelectedTicker(soonestPool.ticker);
    setHasAutoSelected(true);
  }, [hasAutoSelected, normalizedChainId]);

  // Handle chain changes - switch to equivalent pool on new chain
  useEffect(() => {
    if (!normalizedChainId || lastChainId === normalizedChainId) {
      if (normalizedChainId) setLastChainId(normalizedChainId);
      return;
    }

    setLastChainId(normalizedChainId);

    // Map current ticker to equivalent on new chain
    const poolOptions = getPoolOptionsForChain(normalizedChainId);
    const poolTickers = poolOptions.map(p => p.ticker);

    // If current ticker is not available on new chain, switch to equivalent
    if (!poolTickers.includes(selectedTicker)) {
      // Extract base ticker name (without 'e' prefix and without number suffix)
      // e.g., "BASE3" -> "BASE", "eBASE3" -> "BASE", "TRIO2" -> "TRIO", "eTRIO2" -> "TRIO"
      let baseTicker = selectedTicker.replace(/^e/, '').replace(/\d+$/, '');
      
      // Get the latest pool for this base ticker on the new chain
      const latestPool = getLatestPoolByPrefix(baseTicker, normalizedChainId);
      
      if (latestPool) {
        setSelectedTicker(latestPool.ticker as PoolTicker);
      }
      // For other pools (MAXI, DECI, LUCKY), they're available on both chains with same ticker, so keep as is
    }
  }, [normalizedChainId, selectedTicker, lastChainId]);

  // Ensure selectedPool exists, fallback to MAXI if not found
  const selectedPool = PERPETUAL_POOLS[selectedTicker] || PERPETUAL_POOLS.MAXI;
  
  // 🔍 LOG: Pool context state
  console.log('🔍 [PoolContext] Current state', {
    selectedTicker,
    selectedPool: {
      ticker: selectedPool.ticker,
      name: selectedPool.name,
      contractAddress: selectedPool.contractAddress,
    },
    chainId: chain?.id,
    chainName: chain?.name,
  });
  
  const value = {
    selectedPool,
    selectedTicker,
    setSelectedTicker,
  };

  return <PoolContext.Provider value={value}>{children}</PoolContext.Provider>;
}

export function usePool() {
  const context = useContext(PoolContext);
  if (context === undefined) {
    throw new Error('usePool must be used within a PoolProvider');
  }
  return context;
}

