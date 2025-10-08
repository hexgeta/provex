'use client';

import { useContext } from 'react';
import { PoolContext } from '@/context/PoolContext';
import { TOKEN_CONSTANTS } from '@/constants/crypto';
import AnimatedBackground from '@/components/ui/AnimatedBackground';
import { UI_CONFIG } from '@/config/ui';

export default function AnimatedBackgroundWrapper() {
  const context = useContext(PoolContext);

  // Get the color for the currently selected pool
  const getPoolColor = (ticker: string): string => {
    if (!ticker) return UI_CONFIG.ANIMATED_BACKGROUND_COLOR;
    
    // Remove 'e' prefix (for Ethereum versions) and numbers (for BASE cycles) for matching
    const baseTicker = ticker.replace(/^e/, '').replace(/\d+$/, '');
    
    // Find the matching pool in TOKEN_CONSTANTS
    const pool = TOKEN_CONSTANTS.find(t => {
      if (!t.ticker) return false;
      const poolBaseTicker = t.ticker.replace(/\d+$/, '');
      return poolBaseTicker === baseTicker;
    });
    
    console.log('🎨 Background Color Debug:', {
      ticker: ticker,
      baseTicker,
      foundPool: pool?.ticker,
      color: pool?.color || UI_CONFIG.ANIMATED_BACKGROUND_COLOR
    });
    
    return pool?.color || UI_CONFIG.ANIMATED_BACKGROUND_COLOR;
  };

  // Default color if context isn't ready
  const activeColor = context?.selectedTicker 
    ? getPoolColor(context.selectedTicker)
    : UI_CONFIG.ANIMATED_BACKGROUND_COLOR;

  console.log('🎨 Wrapper render:', { selectedTicker: context?.selectedTicker, activeColor });

  return (
    <AnimatedBackground
      enabled={UI_CONFIG.ANIMATED_BACKGROUND_ENABLED}
      dotColor={UI_CONFIG.ANIMATED_BACKGROUND_COLOR}
      dotSize={UI_CONFIG.ANIMATED_BACKGROUND_DOT_SIZE}
      spacing={UI_CONFIG.ANIMATED_BACKGROUND_SPACING}
      animationSpeed={UI_CONFIG.ANIMATED_BACKGROUND_SPEED}
      activePoolColor={activeColor}
    />
  );
}

