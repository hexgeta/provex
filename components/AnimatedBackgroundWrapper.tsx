'use client';

import { useContext, useState, useEffect } from 'react';
import { PoolContext } from '@/context/PoolContext';
import { TOKEN_CONSTANTS } from '@/constants/crypto';
import AnimatedBackground from '@/components/ui/AnimatedBackground';
import { UI_CONFIG } from '@/config/ui';

export default function AnimatedBackgroundWrapper() {
  const context = useContext(PoolContext);
  const [isReady, setIsReady] = useState(false);

  // Wait a brief moment before showing background to avoid flash during wallet connection check
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 600); // Slightly longer than the connection check timeout
    
    return () => clearTimeout(timer);
  }, []);

  // Get the color for the currently selected pool
  const getPoolColor = (ticker: string): string => {
    if (!ticker) return UI_CONFIG.ANIMATED_BACKGROUND_COLOR;
    
    // Remove 'e' prefix (for Ethereum versions like eBASE3 -> BASE3)
    const normalizedTicker = ticker.replace(/^e/, '');
    
    // Find the matching pool in TOKEN_CONSTANTS
    // First try exact match
    let pool = TOKEN_CONSTANTS.find(t => t.ticker === normalizedTicker);
    
    // If no exact match, try matching by base name (e.g., BASE3 -> BASE, BASE2 -> BASE)
    if (!pool) {
      const baseTicker = normalizedTicker.replace(/\d+$/, '');
      pool = TOKEN_CONSTANTS.find(t => {
        if (!t.ticker) return false;
        const poolBaseTicker = t.ticker.replace(/\d+$/, '');
        return poolBaseTicker === baseTicker;
      });
    }
    
    console.log('🎨 Background Color Debug:', {
      ticker: ticker,
      normalizedTicker,
      foundPool: pool?.ticker,
      color: pool?.color || UI_CONFIG.ANIMATED_BACKGROUND_COLOR
    });
    
    return pool?.color || UI_CONFIG.ANIMATED_BACKGROUND_COLOR;
  };

  // Default color if context isn't ready
  const activeColor = context?.selectedTicker 
    ? getPoolColor(context.selectedTicker)
    : UI_CONFIG.ANIMATED_BACKGROUND_COLOR;

  console.log('🎨 Wrapper render:', { selectedTicker: context?.selectedTicker, activeColor, isReady });

  // Don't render until ready to avoid flash during wallet connection check
  if (!isReady) return null;

  return (
    <AnimatedBackground
      enabled={UI_CONFIG.ANIMATED_BACKGROUND_ENABLED}
      dotColor={activeColor}
      dotSize={UI_CONFIG.ANIMATED_BACKGROUND_DOT_SIZE}
      spacing={UI_CONFIG.ANIMATED_BACKGROUND_SPACING}
      animationSpeed={UI_CONFIG.ANIMATED_BACKGROUND_SPEED}
      activePoolColor={activeColor}
    />
  );
}

