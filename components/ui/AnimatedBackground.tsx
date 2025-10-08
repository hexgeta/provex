'use client';

import React, { useEffect, useRef, useState } from 'react';

interface AnimatedBackgroundProps {
  enabled?: boolean;
  dotColor?: string;
  dotSize?: number;
  spacing?: number;
  animationSpeed?: number;
  activePoolColor?: string;
}

export default function AnimatedBackground({
  enabled = true,
  dotColor = '#2D82F3',
  dotSize = 12,
  spacing = 30,
  animationSpeed = 0.00005,
  activePoolColor,
}: AnimatedBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
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
    
    console.log('🎨 AnimatedBackground color update:', {
      activePoolColor,
      targetColor,
      previousColor: previousColorRef.current,
      willTransition: targetColor !== previousColorRef.current
    });
    
    // Only transition if the color actually changed
    if (targetColor !== previousColorRef.current) {
      const targetRgb = hexToRgb(targetColor);
      const startRgb = hexToRgb(previousColorRef.current);
      let progress = 0;
      
      console.log('🎨 Starting color transition:', {
        from: previousColorRef.current,
        to: targetColor,
        fromRgb: startRgb,
        toRgb: targetRgb
      });
      
      const transitionInterval = setInterval(() => {
        progress += 0.02; // Smooth transition over ~50 frames
        
        if (progress >= 1) {
          progress = 1;
          clearInterval(transitionInterval);
          setCurrentColor(targetColor);
          previousColorRef.current = targetColor;
          console.log('🎨 Color transition complete:', targetColor);
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
    if (!enabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

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
    for (let y = 0; y < canvas.height; y += spacing) {
      for (let x = 0; x < canvas.width; x += spacing) {
        const clusterValue = noise(x, y, 0);
        const density = noise(x + 1000, y + 1000, 0); // Different noise pattern for density
        
        // Add significant random offset to break grid pattern
        const randomOffsetX = (Math.random() - 0.5) * spacing * 0.8;
        const randomOffsetY = (Math.random() - 0.5) * spacing * 0.8;
        
        // Add main dot with random offset
        dots.push({
          x: x + randomOffsetX,
          y: y + randomOffsetY,
          baseX: x + randomOffsetX,
          baseY: y + randomOffsetY,
          cluster: clusterValue,
          noiseOffsetX: Math.random() * Math.PI * 2,
          noiseOffsetY: Math.random() * Math.PI * 2,
        });
        
        // Add extra dots for organic clustering based on density
        const numExtraDots = density > 0.8 ? Math.floor(density * 2) : 0;
        for (let i = 0; i < numExtraDots; i++) {
          const angle = Math.random() * Math.PI * 2;
          const distance = Math.random() * spacing * 0.9;
          const offsetX = Math.cos(angle) * distance;
          const offsetY = Math.sin(angle) * distance;
          
          dots.push({
            x: x + offsetX + randomOffsetX,
            y: y + offsetY + randomOffsetY,
            baseX: x + offsetX + randomOffsetX,
            baseY: y + offsetY + randomOffsetY,
            cluster: clusterValue,
            noiseOffsetX: Math.random() * Math.PI * 2,
            noiseOffsetY: Math.random() * Math.PI * 2,
          });
        }
      }
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      time += animationSpeed;

      dots.forEach((dot) => {
        // Dynamic clustering based on noise - creates organic shapes
        const clusterNoise = noise(dot.baseX, dot.baseY, time * 2);
        const attractionX = noise(dot.baseX * 0.5, dot.baseY * 0.5, time * 1.5 + dot.noiseOffsetX);
        const attractionY = noise(dot.baseX * 0.5, dot.baseY * 0.5, time * 1.5 + dot.noiseOffsetY);
        
        // Add chaotic, random movement with multiple frequencies
        const wave1 = Math.sin(dot.baseX * 0.01 + time * 3 + dot.noiseOffsetX) * 12;
        const wave2 = Math.cos(dot.baseY * 0.01 + time * 3 + dot.noiseOffsetY) * 12;
        const wave3 = Math.sin((dot.baseX + dot.baseY) * 0.005 + time * 4) * 7;
        
        // Add high-frequency jitter for more chaotic movement
        const jitterX = Math.sin(dot.baseX * 0.05 + time * 8 + dot.noiseOffsetX) * 3;
        const jitterY = Math.cos(dot.baseY * 0.05 + time * 8 + dot.noiseOffsetY) * 3;
        
        // Add slow drift
        const driftX = Math.sin(time * 0.5 + dot.noiseOffsetX) * 5;
        const driftY = Math.cos(time * 0.5 + dot.noiseOffsetY) * 5;
        
        // Pull dots together in areas of high noise (creates organic shapes)
        const pullX = (attractionX - 0.5) * 10 * clusterNoise;
        const pullY = (attractionY - 0.5) * 10 * clusterNoise;

        dot.x = dot.baseX + wave1 + wave3 + pullX + jitterX + driftX;
        dot.y = dot.baseY + wave2 + wave3 + pullY + jitterY + driftY;

        // Calculate opacity based on clustering and movement
        const intensity = (Math.sin(dot.baseX * 0.02 + dot.baseY * 0.02 + time * 5) + 1) / 2;
        const clusterBoost = clusterNoise * 0.2; // Dots in clusters are brighter
        const shapeBoost = (attractionX + attractionY) * 0.1; // Dots forming shapes glow
        const opacity = 0.25 + intensity * 0.25 + clusterBoost + shapeBoost;

        // Draw irregular, pixelated blobs instead of perfect circles
        const pixelSize = 0.8; // Size of individual pixels
        const numPixels = 8; // Number of pixels to create blob
        
        for (let n = 0; n < numPixels; n++) {
          // Random offset from center to create irregular shape
          const offsetX = (Math.random() - 0.5) * dotSize * 1.5;
          const offsetY = (Math.random() - 0.5) * dotSize * 1.5;
          
          // Distance from center - fade edges
          const dist = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
          const maxDist = dotSize * 0.75;
          
          if (dist < maxDist) {
            const edgeFade = 1 - (dist / maxDist);
            const pixelOpacity = opacity * edgeFade * (0.8 + Math.random() * 0.4);
            
            // Use transitioning color
            const rgb = colorTransitionRef.current;
            ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${Math.min(pixelOpacity, 1)})`;
            
            // Draw small rectangles instead of circles for pixelated look
            ctx.fillRect(
              dot.x + offsetX - pixelSize / 2,
              dot.y + offsetY - pixelSize / 2,
              pixelSize + Math.random() * 0.4, // Slight size variation
              pixelSize + Math.random() * 0.4
            );
          }
        }
      });

      // Add horizontal fade gradient on edges
      const fadeWidth = canvas.width * 0.25; // 25% fade on each side
      
      // Left fade (black to transparent)
      const leftGradient = ctx.createLinearGradient(0, 0, fadeWidth, 0);
      leftGradient.addColorStop(0, 'rgba(0, 0, 0, 0.8)');
      leftGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = leftGradient;
      ctx.fillRect(0, 0, fadeWidth, canvas.height);
      
      // Right fade (transparent to black)
      const rightGradient = ctx.createLinearGradient(canvas.width - fadeWidth, 0, canvas.width, 0);
      rightGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
      rightGradient.addColorStop(1, 'rgba(0, 0, 0, 0.8)');
      ctx.fillStyle = rightGradient;
      ctx.fillRect(canvas.width - fadeWidth, 0, fadeWidth, canvas.height);

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [enabled, dotColor, dotSize, spacing, animationSpeed]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 animate-in fade-in duration-1000 w-screen h-screen"
      style={{ opacity: 1 }}
    />
  );
}

