'use client';

import { motion } from 'framer-motion';
import { usePool } from '@/context/PoolContext';
import { POOL_OPTIONS, PoolTicker } from '@/config/perpetual-pools';

export default function PoolSelector() {
  const { selectedTicker, setSelectedTicker, selectedPool } = usePool();

  // Clean look - all unselected buttons have white text
  const getHoverTextColor = () => {
    return 'text-white/70 hover:text-white';
  };

  return (
    <div className="w-full max-w-2xl mx-auto mb-6">
      <div className="flex justify-center mb-4 w-full">
        <div 
          className="flex items-center bg-black border rounded-[12px] relative w-full p-1"
          style={{ borderColor: selectedPool.color }}
        >
          {POOL_OPTIONS.map((pool) => {
            const isSelected = selectedTicker === pool.ticker;
            return (
              <button
                key={pool.ticker}
                onClick={() => setSelectedTicker(pool.ticker as PoolTicker)}
                className={`flex-1 px-4 md:px-6 py-2 md:py-2 rounded-md text-sm md:text-base font-bold transition-colors duration-200 relative z-10 whitespace-nowrap ${
                  isSelected
                    ? pool.ticker === 'TRIO' ? 'text-black' : 'text-white'
                    : getHoverTextColor()
                }`}
              >
                {isSelected && (
                  <motion.div
                    layoutId="activePoolTab"
                    className="absolute inset-0 rounded-md shadow-md"
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 30
                    }}
                    style={{ 
                      zIndex: -1,
                      backgroundColor: pool.color
                    }}
                  />
                )}
                {pool.ticker}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

