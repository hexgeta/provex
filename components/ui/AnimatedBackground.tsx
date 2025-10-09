'use client';

import React, { useEffect, useRef, useState } from 'react';
import { usePool } from '@/context/PoolContext';
import { TOKEN_CONSTANTS } from '@/constants/crypto';

// ========================================
// ANIMATION CONFIGURATION - Tweak these values!
// ========================================
const ANIMATION_CONFIG = {
  enabled: true,
  dotSize: 2,              // Size of each dot (min: 2, max: 20)
  spacing: 90,             // Grid spacing - LOWER = more dots (min: 10, max: 300)
  floatingSpeed: 0.001,     // Time speed (min: 0.0001, max: 0.05)
  wanderSpeed: 0.4,         // Random roaming speed (min: 0, max: 10)
  flashingSpeed: 0,         // Pulse/flash speed (min: 0, max: 20)
  clusterAttraction: 10,   // Gravity pull strength (min: 0, max: 200)
  chaos: 1,               // Separation force (min: 0.0, max: 1.0)
  momentum: 0.85,           // Movement smoothness - HIGHER = smoother (min: 0.0, max: 0.99)
  pixelNoise: 0,          // Pixel skip chance - HIGHER = more holes/noise (min: 0.0, max: 0.9)
  pixelDensity: 4,          // Pixels per dot (min: 2, max: 8) - HIGHER = more detailed
  defaultColor: '#ffffff',  // Dot color when no pool selected (hex color)
  baseOpacity: 1,         // Visibility (min: 0.0, max: 1.0)
};

export default function AnimatedBackground() {
  const { selectedTicker } = usePool();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isReady, setIsReady] = useState(false);

  // Delay showing the background briefly to coordinate with page load
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 100); // Small delay to ensure canvas is ready
    return () => clearTimeout(timer);
  }, []);

  // Get the color for the currently selected pool
  const getPoolColor = (ticker: string): string => {
    if (!ticker) return ANIMATION_CONFIG.defaultColor;
    
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
    
    return pool?.color || ANIMATION_CONFIG.defaultColor;
  };

  // Get active color based on selected pool
  const activeColor = selectedTicker 
    ? getPoolColor(selectedTicker)
    : ANIMATION_CONFIG.defaultColor;

  const dotColor = activeColor;
  const activePoolColor = activeColor;
  
  // Helper: Parse hex color to RGB
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 45, g: 130, b: 243 };
  };

  // Initialize with activePoolColor if available, otherwise use dotColor
  const initialColor = activePoolColor || dotColor;
  const [currentColor, setCurrentColor] = useState(initialColor);
  const colorTransitionRef = useRef(hexToRgb(initialColor));
  const previousColorRef = useRef(initialColor);

  // Smoothly transition color when activePoolColor changes
  useEffect(() => {
    const targetColor = activePoolColor || dotColor;
    
    // Only transition if the color actually changed
    if (targetColor !== previousColorRef.current) {
      const targetRgb = hexToRgb(targetColor);
      const startRgb = hexToRgb(previousColorRef.current);
      let progress = 0;
      
      const transitionInterval = setInterval(() => {
        progress += 0.09; // Smooth transition over ~50 frames
        
        if (progress >= 1) {
          progress = 1;
          clearInterval(transitionInterval);
          setCurrentColor(targetColor);
          previousColorRef.current = targetColor;
        }
        
        // Lerp between colors
        colorTransitionRef.current = {
          r: Math.round(startRgb.r + (targetRgb.r - startRgb.r) * progress),
          g: Math.round(startRgb.g + (targetRgb.g - startRgb.g) * progress),
          b: Math.round(startRgb.b + (targetRgb.b - startRgb.b) * progress),
        };
      }, 16); // ~60fps
      
      return () => clearInterval(transitionInterval);
    }
  }, [activePoolColor, dotColor, hexToRgb]);

  useEffect(() => {
    if (!ANIMATION_CONFIG.enabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;
    let lastFrameTime = 0;
    const targetFPS = 30; // Limit to 30 FPS for performance
    const frameInterval = 1000 / targetFPS;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const dots: { 
      x: number; 
      y: number; 
      baseX: number; 
      baseY: number; 
      vx: number;        // velocity X for momentum
      vy: number;        // velocity Y for momentum
      cluster: number;
      noiseOffsetX: number;
      noiseOffsetY: number;
    }[] = [];

    // Simple noise function for organic clustering
    const noise = (x: number, y: number, time: number) => {
      const n1 = Math.sin(x * 0.003 + time * 0.5) * Math.cos(y * 0.003 + time * 0.3);
      const n2 = Math.sin((x + y) * 0.002 + time * 0.7) * 0.5;
      const n3 = Math.cos(x * 0.001 - y * 0.001 + time * 0.4) * 0.3;
      return (n1 + n2 + n3) * 0.5 + 0.5; // Normalize to 0-1
    };

    // Create dot grid with heavy randomization to break grid pattern
    for (let y = 0; y < canvas.height; y += ANIMATION_CONFIG.spacing) {
      for (let x = 0; x < canvas.width; x += ANIMATION_CONFIG.spacing) {
        const clusterValue = noise(x, y, 0);
        const density = noise(x + 1000, y + 1000, 0); // Different noise pattern for density
        
        // Add significant random offset to break grid pattern
        const randomOffsetX = (Math.random() - 0.5) * ANIMATION_CONFIG.spacing * 0.8;
        const randomOffsetY = (Math.random() - 0.5) * ANIMATION_CONFIG.spacing * 0.8;
        
        // Add main dot with random offset
        dots.push({
          x: x + randomOffsetX,
          y: y + randomOffsetY,
          baseX: x + randomOffsetX,
          baseY: y + randomOffsetY,
          vx: 0,
          vy: 0,
          cluster: clusterValue,
          noiseOffsetX: Math.random() * Math.PI * 2,
          noiseOffsetY: Math.random() * Math.PI * 2,
        });
        
        // Add extra dots for organic clustering based on density
        const numExtraDots = density > 0.8 ? Math.floor(density * 2) : 0;
        for (let i = 0; i < numExtraDots; i++) {
          const angle = Math.random() * Math.PI * 2;
          const distance = Math.random() * ANIMATION_CONFIG.spacing * 0.9;
          const offsetX = Math.cos(angle) * distance;
          const offsetY = Math.sin(angle) * distance;
          
          dots.push({
            x: x + offsetX + randomOffsetX,
            y: y + offsetY + randomOffsetY,
            baseX: x + offsetX + randomOffsetX,
            baseY: y + offsetY + randomOffsetY,
            vx: 0,
            vy: 0,
            cluster: clusterValue,
            noiseOffsetX: Math.random() * Math.PI * 2,
            noiseOffsetY: Math.random() * Math.PI * 2,
          });
        }
      }
    }

    const animate = (currentTime: number) => {
      // FPS limiter - skip frames if needed
      const elapsed = currentTime - lastFrameTime;
      if (elapsed < frameInterval) {
        animationFrameId = requestAnimationFrame(animate);
        return;
      }
      lastFrameTime = currentTime - (elapsed % frameInterval);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      time += ANIMATION_CONFIG.floatingSpeed;

      dots.forEach((dot) => {
        // INDEPENDENT BEE SWARM BEHAVIOR - each dot moves on its own
        
        // Each dot uses its unique offset for different noise values
        const clusterNoise = noise(dot.x * 0.005 + dot.noiseOffsetX, dot.y * 0.005 + dot.noiseOffsetY, time);
        
        // INDIVIDUAL WANDERING - each dot has its own path
        const wanderAngle = noise(dot.noiseOffsetX * 10, dot.noiseOffsetY * 10, time * 2) * Math.PI * 2;
        const wanderX = Math.cos(wanderAngle) * ANIMATION_CONFIG.wanderSpeed;
        const wanderY = Math.sin(wanderAngle) * ANIMATION_CONFIG.wanderSpeed;
        
        // GRAVITY ATTRACTION - dots near each other attract
        const pullX = (clusterNoise - 0.5) * ANIMATION_CONFIG.clusterAttraction;
        const pullY = (Math.sin(clusterNoise * Math.PI + dot.noiseOffsetY) - 0.5) * ANIMATION_CONFIG.clusterAttraction;
        
        // CHAOS - individual random bursts
        const shouldSeparate = Math.random() < ANIMATION_CONFIG.chaos * 0.01;
        const separationX = shouldSeparate ? (Math.random() - 0.5) * 50 : 0;
        const separationY = shouldSeparate ? (Math.random() - 0.5) * 50 : 0;
        
        // Apply forces to velocity - each dot moves independently
        dot.vx = dot.vx * ANIMATION_CONFIG.momentum + (wanderX + pullX + separationX) * 0.1;
        dot.vy = dot.vy * ANIMATION_CONFIG.momentum + (wanderY + pullY + separationY) * 0.1;
        
        // Update position with velocity
        dot.x += dot.vx;
        dot.y += dot.vy;
        
        // EDGE WRAPPING - dots wrap around screen for continuous roaming
        if (dot.x < -50) dot.x = canvas.width + 50;
        if (dot.x > canvas.width + 50) dot.x = -50;
        if (dot.y < -50) dot.y = canvas.height + 50;
        if (dot.y > canvas.height + 50) dot.y = -50;

        // Calculate opacity - FLASHING/PULSING effect (simplified)
        const flashCycle = (Math.sin(time * ANIMATION_CONFIG.flashingSpeed + dot.noiseOffsetX) + 1) * 0.3;
        const opacity = ANIMATION_CONFIG.baseOpacity * (0.5 + flashCycle + clusterNoise * 0.2);

        // Draw pixelated square with noise - like retro pixels
        const rgb = colorTransitionRef.current;
        const size = ANIMATION_CONFIG.dotSize;
        
        // Create cluster of small squares for pixelated look
        const pixelsPerDot = ANIMATION_CONFIG.pixelDensity;
        const pixelSize = size / pixelsPerDot;
        
        for (let px = 0; px < pixelsPerDot; px++) {
          for (let py = 0; py < pixelsPerDot; py++) {
            // Random chance to skip pixels for noisy appearance (causes shape changing)
            if (Math.random() > (1 - ANIMATION_CONFIG.pixelNoise)) continue;
            
            // Vary opacity for each pixel
            const pixelOpacity = opacity * (0.6 + Math.random() * 0.4);
            
            ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${pixelOpacity})`;
            ctx.fillRect(
              dot.x + px * pixelSize - size / 2,
              dot.y + py * pixelSize - size / 2,
              pixelSize,
              pixelSize
            );
          }
        }
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [activePoolColor]); // All other config values are in ANIMATION_CONFIG constant

  if (!ANIMATION_CONFIG.enabled) return null;

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-0 w-screen h-screen transition-opacity duration-700 ease-out"
        style={{ opacity: isReady ? 1 : 0 }}
      />
      {/* Gradient overlay on top of background */}
      <div 
        className="fixed inset-0 z-[1] pointer-events-none transition-opacity duration-700 ease-out"
        style={{
          opacity: isReady ? 1 : 0,
          background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 0%, rgba(0,0,0,0.4) 30%, rgba(0,0,0,0.9) 100%)'
        }}
      />
    </>
  );
}

