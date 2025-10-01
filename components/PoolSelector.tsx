'use client';

import { motion } from 'framer-motion';
import { usePool } from '@/context/PoolContext';
import { POOL_OPTIONS, PoolTicker } from '@/config/perpetual-pools';

export default function PoolSelector() {
  const { selectedTicker, setSelectedTicker, selectedPool } = usePool();

  // Get border color based on selected pool
  const getBorderColor = () => {
    switch (selectedTicker) {
      case 'TRIO':
        return 'border-purple-600';
      case 'DECI':
        return 'border-green-600';
      case 'LUCKY':
        return 'border-yellow-600';
      case 'BASE':
        return 'border-blue-600';
      default:
        return 'border-purple-600';
    }
  };

  // Get background gradient class for active button
  const getActiveBackground = (ticker: string) => {
    switch (ticker) {
      case 'TRIO':
        return 'bg-purple-600';
      case 'DECI':
        return 'bg-green-600';
      case 'LUCKY':
        return 'bg-yellow-600';
      case 'BASE':
        return 'bg-blue-600';
      default:
        return 'bg-purple-600';
    }
  };

  // Clean look - all unselected buttons have white text
  const getHoverTextColor = () => {
    return 'text-white/70 hover:text-white';
  };

  return (
    <div className="w-full max-w-4xl mx-auto mb-6">
      <div className="flex justify-center mb-4 w-full">
        <div className={`inline-flex items-center bg-black border rounded-full relative w-full md:w-auto ${getBorderColor()}`}>
          {POOL_OPTIONS.map((pool) => {
            const isSelected = selectedTicker === pool.ticker;
            return (
              <button
                key={pool.ticker}
                onClick={() => setSelectedTicker(pool.ticker as PoolTicker)}
                className={`flex-1 md:flex-none px-4 md:px-6 py-2 md:py-3 rounded-full text-sm md:text-base font-bold transition-colors duration-200 relative z-10 whitespace-nowrap ${
                  isSelected
                    ? 'text-white'
                    : getHoverTextColor()
                }`}
              >
                {isSelected && (
                  <motion.div
                    layoutId="activePoolTab"
                    className={`absolute inset-0 rounded-full ${getActiveBackground(pool.ticker)} shadow-sm`}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 30
                    }}
                    style={{ zIndex: -1 }}
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

