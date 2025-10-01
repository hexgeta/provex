'use client';

import { motion } from 'framer-motion';
import { usePool } from '@/context/PoolContext';
import { POOL_OPTIONS, PoolTicker } from '@/config/perpetual-pools';

export default function PoolSelector() {
  const { selectedTicker, setSelectedTicker } = usePool();

  return (
    <div className="w-full max-w-4xl mx-auto mb-8">
      <div className="bg-black/40 border border-white/10 rounded-2xl p-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-3 text-center">
          SELECT PERPETUAL POOL
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {POOL_OPTIONS.map((pool) => {
            const isSelected = selectedTicker === pool.ticker;
            return (
              <motion.button
                key={pool.ticker}
                onClick={() => setSelectedTicker(pool.ticker as PoolTicker)}
                className={`relative px-6 py-4 rounded-xl font-bold text-lg transition-all ${
                  isSelected
                    ? `bg-gradient-to-r ${pool.gradientFrom} ${pool.gradientTo} text-white border-2 border-white/30`
                    : 'bg-black/60 text-gray-400 border-2 border-white/10 hover:border-white/30 hover:text-white'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {pool.ticker}
                {isSelected && (
                  <motion.div
                    className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full"
                    layoutId="selectedIndicator"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

