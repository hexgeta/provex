'use client';

import { useState, useEffect } from 'react';
import { usePool } from '@/context/PoolContext';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

export default function PoolCountdown() {
  const { selectedPool } = usePool();
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 });

  useEffect(() => {
    const calculateTimeLeft = (): TimeLeft => {
      const now = new Date();
      const deadline = new Date(selectedPool.deadlineUTC);
      const difference = deadline.getTime() - now.getTime();

      if (difference <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      return { days, hours, minutes, seconds, total: difference };
    };

    // Initial calculation
    setTimeLeft(calculateTimeLeft());

    // Update every second
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [selectedPool.deadlineUTC]);

  const isExpired = timeLeft.total <= 0;

  // Convert hex color to RGB for opacity
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 147, g: 51, b: 234 }; // fallback purple
  };

  const rgb = hexToRgb(selectedPool.color);
  const borderColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`;
  const bgColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`;

  if (isExpired) {
    return (
      <div 
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border"
        style={{ backgroundColor: bgColor, borderColor }}
      >
        <span className="text-sm font-semibold text-red-400">Pool Ended</span>
      </div>
    );
  }

  return (
    <div 
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border"
      style={{ backgroundColor: bgColor, borderColor }}
    >
      <span className="text-xs text-gray-400">Ends in:</span>
      <div className="flex items-center gap-1 font-mono text-sm font-semibold">
        {timeLeft.days > 0 && (
          <>
            <span style={{ color: selectedPool.color }}>{timeLeft.days}</span>
            <span className="text-gray-500 text-xs">d</span>
          </>
        )}
        <span style={{ color: selectedPool.color }}>{timeLeft.hours.toString().padStart(2, '0')}</span>
        <span className="text-gray-500">:</span>
        <span style={{ color: selectedPool.color }}>{timeLeft.minutes.toString().padStart(2, '0')}</span>
        <span className="text-gray-500">:</span>
        <span style={{ color: selectedPool.color }}>{timeLeft.seconds.toString().padStart(2, '0')}</span>
      </div>
    </div>
  );
}

