'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { PERPETUAL_POOLS, PerpetualPoolConfig, PoolTicker } from '@/config/perpetual-pools';

interface PoolContextType {
  selectedPool: PerpetualPoolConfig;
  selectedTicker: PoolTicker;
  setSelectedTicker: (ticker: PoolTicker) => void;
}

const PoolContext = createContext<PoolContextType | undefined>(undefined);

export function PoolProvider({ children }: { children: ReactNode }) {
  const [selectedTicker, setSelectedTicker] = useState<PoolTicker>('TRIO');

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

