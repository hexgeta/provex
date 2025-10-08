'use client';

import { motion } from 'framer-motion';
import { useAccount } from 'wagmi';
import { usePool } from '@/context/PoolContext';
import { getPoolOptionsForChain, PoolTicker, PerpetualPoolConfig } from '@/config/perpetual-pools';
import { formatTickerName } from '@/utils/format';

export default function PoolSelector() {
  const { chain } = useAccount();
  const { selectedTicker, setSelectedTicker, selectedPool } = usePool();
  const poolOptions = getPoolOptionsForChain(chain?.id);

  // Inactive buttons use the selected pool's color
  const getInactiveTextStyle = () => {
    return { color: selectedPool.color };
  };

  return (
    <div className="w-full max-w-xl mx-auto mb-6">
      <div className="flex justify-center mb-4 w-full">
        <div 
          className="flex items-center bg-black border-2 rounded-full relative w-full p-1"
          style={{ borderColor: `${selectedPool.color}80` }}
        >
          {poolOptions.map((pool: PerpetualPoolConfig) => {
            const isSelected = selectedTicker === pool.ticker;
            return (
              <button
                key={pool.ticker}
                onClick={() => setSelectedTicker(pool.ticker as PoolTicker)}
                className={`flex-1 px-4 md:px-6 py-2 md:py-2 rounded-full text-[10px] md:text-base font-bold transition-colors duration-200 relative z-10 whitespace-nowrap ${
                  isSelected
                    ? pool.ticker === 'TRIO' || pool.ticker === 'eTRIO' ? 'text-black' : 'text-white'
                    : ''
                }`}
                style={!isSelected ? getInactiveTextStyle() : undefined}
              >
                {isSelected && (
                  <motion.div
                    layoutId="activePoolTab"
                    className="absolute inset-0 rounded-full shadow-md"
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
                {formatTickerName(pool.ticker)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

