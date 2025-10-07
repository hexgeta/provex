'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAccount } from 'wagmi';
import { PERPETUAL_POOLS, PerpetualPoolConfig, PoolTicker, getPoolOptionsForChain } from '@/config/perpetual-pools';

interface PoolContextType {
  selectedPool: PerpetualPoolConfig;
  selectedTicker: PoolTicker;
  setSelectedTicker: (ticker: PoolTicker) => void;
}

const PoolContext = createContext<PoolContextType | undefined>(undefined);

export function PoolProvider({ children }: { children: ReactNode }) {
  const { chain } = useAccount();
  const [selectedTicker, setSelectedTicker] = useState<PoolTicker>('MAXI'); // Default to MAXI
  const [hasAutoSelected, setHasAutoSelected] = useState(false);
  const [lastChainId, setLastChainId] = useState<number | undefined>(undefined);

  // Auto-select pool ending soonest using hardcoded deadlineUTC values
  useEffect(() => {
    if (hasAutoSelected) return;
    
    const poolOptions = getPoolOptionsForChain(chain?.id);
    const pools = poolOptions.map(pool => ({
      ticker: pool.ticker as PoolTicker,
      deadline: new Date(pool.deadlineUTC).getTime()
    }));

    // Find pool with earliest deadline (ends soonest)
    const soonestPool = pools.reduce((prev, curr) => 
      curr.deadline < prev.deadline ? curr : prev
    );

    setSelectedTicker(soonestPool.ticker);
    setHasAutoSelected(true);
  }, [hasAutoSelected, chain?.id]);

  // Handle chain changes - switch to equivalent pool on new chain
  useEffect(() => {
    if (!chain?.id || lastChainId === chain?.id) {
      if (chain?.id) setLastChainId(chain.id);
      return;
    }

    setLastChainId(chain.id);

    // Map current ticker to equivalent on new chain
    const poolOptions = getPoolOptionsForChain(chain.id);
    const poolTickers = poolOptions.map(p => p.ticker);

    // If current ticker is not available on new chain, switch to equivalent
    if (!poolTickers.includes(selectedTicker)) {
      // Switch BASE3 <-> eBASE3 when changing chains
      if (selectedTicker === 'BASE3' && poolTickers.includes('eBASE3')) {
        setSelectedTicker('eBASE3');
      } else if (selectedTicker === 'eBASE3' && poolTickers.includes('BASE3')) {
        setSelectedTicker('BASE3');
      }
      // For other pools (MAXI, DECI, LUCKY, TRIO), they're available on both chains, so keep as is
    }
  }, [chain?.id, selectedTicker, lastChainId]);

  const value = {
    selectedPool: PERPETUAL_POOLS[selectedTicker],
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

