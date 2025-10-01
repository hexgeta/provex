'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { PERPETUAL_POOLS, POOL_OPTIONS, PerpetualPoolConfig, PoolTicker } from '@/config/perpetual-pools';

interface PoolContextType {
  selectedPool: PerpetualPoolConfig;
  selectedTicker: PoolTicker;
  setSelectedTicker: (ticker: PoolTicker) => void;
}

const PoolContext = createContext<PoolContextType | undefined>(undefined);

// Get pool ending soonest
const getPoolEndingSoonest = (): PoolTicker => {
  let soonestPool = POOL_OPTIONS[0];
  let soonestDate = new Date(soonestPool.deadlineUTC);

  POOL_OPTIONS.forEach(pool => {
    const poolDate = new Date(pool.deadlineUTC);
    if (poolDate < soonestDate) {
      soonestDate = poolDate;
      soonestPool = pool;
    }
  });

  return soonestPool.ticker as PoolTicker;
};

export function PoolProvider({ children }: { children: ReactNode }) {
  const [selectedTicker, setSelectedTicker] = useState<PoolTicker>(getPoolEndingSoonest());

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

