'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { PERPETUAL_POOLS, PerpetualPoolConfig, PoolTicker } from '@/config/perpetual-pools';

interface PoolContextType {
  selectedPool: PerpetualPoolConfig;
  selectedTicker: PoolTicker;
  setSelectedTicker: (ticker: PoolTicker) => void;
}

const PoolContext = createContext<PoolContextType | undefined>(undefined);

export function PoolProvider({ children }: { children: ReactNode }) {
  const [selectedTicker, setSelectedTicker] = useState<PoolTicker>('MAXI'); // Default to MAXI
  const [hasAutoSelected, setHasAutoSelected] = useState(false);

  // Auto-select pool ending soonest using hardcoded deadlineUTC values
  useEffect(() => {
    if (hasAutoSelected) return;
    
    const pools = [
      { ticker: 'TRIO' as PoolTicker, deadline: new Date(PERPETUAL_POOLS.TRIO.deadlineUTC).getTime() },
      { ticker: 'DECI' as PoolTicker, deadline: new Date(PERPETUAL_POOLS.DECI.deadlineUTC).getTime() },
      { ticker: 'LUCKY' as PoolTicker, deadline: new Date(PERPETUAL_POOLS.LUCKY.deadlineUTC).getTime() },
      { ticker: 'BASE3' as PoolTicker, deadline: new Date(PERPETUAL_POOLS.BASE3.deadlineUTC).getTime() },
    ];

    // Find pool with earliest deadline (ends soonest)
    const soonestPool = pools.reduce((prev, curr) => 
      curr.deadline < prev.deadline ? curr : prev
    );

    setSelectedTicker(soonestPool.ticker);
    setHasAutoSelected(true);
  }, [hasAutoSelected]);

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

