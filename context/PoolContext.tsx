'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useContractRead } from 'wagmi';
import { parseAbi } from 'viem';
import { PERPETUAL_POOLS, PerpetualPoolConfig, PoolTicker } from '@/config/perpetual-pools';

interface PoolContextType {
  selectedPool: PerpetualPoolConfig;
  selectedTicker: PoolTicker;
  setSelectedTicker: (ticker: PoolTicker) => void;
}

const PoolContext = createContext<PoolContextType | undefined>(undefined);

const STAKE_END_ABI = parseAbi([
  'function STAKE_END_DAY() view returns (uint256)',
]);

export function PoolProvider({ children }: { children: ReactNode }) {
  const [selectedTicker, setSelectedTicker] = useState<PoolTicker>('TRIO'); // Default to TRIO
  const [hasAutoSelected, setHasAutoSelected] = useState(false);

  // Read STAKE_END_DAY from all contracts
  const { data: trioEndDay } = useContractRead({
    address: PERPETUAL_POOLS.TRIO.contractAddress,
    abi: STAKE_END_ABI,
    functionName: 'STAKE_END_DAY',
  });

  const { data: deciEndDay } = useContractRead({
    address: PERPETUAL_POOLS.DECI.contractAddress,
    abi: STAKE_END_ABI,
    functionName: 'STAKE_END_DAY',
  });

  const { data: luckyEndDay } = useContractRead({
    address: PERPETUAL_POOLS.LUCKY.contractAddress,
    abi: STAKE_END_ABI,
    functionName: 'STAKE_END_DAY',
  });

  const { data: baseEndDay } = useContractRead({
    address: PERPETUAL_POOLS.BASE.contractAddress,
    abi: STAKE_END_ABI,
    functionName: 'STAKE_END_DAY',
  });

  // Auto-select pool ending soonest once all data is loaded
  useEffect(() => {
    if (hasAutoSelected) return;
    
    if (trioEndDay && deciEndDay && luckyEndDay && baseEndDay) {
      const pools = [
        { ticker: 'TRIO' as PoolTicker, endDay: trioEndDay },
        { ticker: 'DECI' as PoolTicker, endDay: deciEndDay },
        { ticker: 'LUCKY' as PoolTicker, endDay: luckyEndDay },
        { ticker: 'BASE' as PoolTicker, endDay: baseEndDay },
      ];

      // Find pool with smallest end day (ends soonest)
      const soonestPool = pools.reduce((prev, curr) => 
        curr.endDay < prev.endDay ? curr : prev
      );

      setSelectedTicker(soonestPool.ticker);
      setHasAutoSelected(true);
    }
  }, [trioEndDay, deciEndDay, luckyEndDay, baseEndDay, hasAutoSelected]);

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

