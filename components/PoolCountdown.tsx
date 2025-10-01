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

  // Get color based on selected pool
  const getTextColor = () => {
    switch (selectedPool.ticker) {
      case 'TRIO':
        return 'text-purple-400';
      case 'DECI':
        return 'text-green-400';
      case 'LUCKY':
        return 'text-yellow-400';
      case 'BASE':
        return 'text-blue-400';
      default:
        return 'text-gray-400';
    }
  };

  const getBorderColor = () => {
    switch (selectedPool.ticker) {
      case 'TRIO':
        return 'border-purple-500/30';
      case 'DECI':
        return 'border-green-500/30';
      case 'LUCKY':
        return 'border-yellow-500/30';
      case 'BASE':
        return 'border-blue-500/30';
      default:
        return 'border-gray-500/30';
    }
  };

  const getBgColor = () => {
    switch (selectedPool.ticker) {
      case 'TRIO':
        return 'bg-purple-900/20';
      case 'DECI':
        return 'bg-green-900/20';
      case 'LUCKY':
        return 'bg-yellow-900/20';
      case 'BASE':
        return 'bg-blue-900/20';
      default:
        return 'bg-gray-900/20';
    }
  };

  if (isExpired) {
    return (
      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${getBgColor()} border ${getBorderColor()}`}>
        <span className="text-sm font-semibold text-red-400">Pool Ended</span>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${getBgColor()} border ${getBorderColor()}`}>
      <span className="text-xs text-gray-400">Ends in:</span>
      <div className="flex items-center gap-1 font-mono text-sm font-semibold">
        {timeLeft.days > 0 && (
          <>
            <span className={getTextColor()}>{timeLeft.days}</span>
            <span className="text-gray-500 text-xs">d</span>
          </>
        )}
        <span className={getTextColor()}>{timeLeft.hours.toString().padStart(2, '0')}</span>
        <span className="text-gray-500">:</span>
        <span className={getTextColor()}>{timeLeft.minutes.toString().padStart(2, '0')}</span>
        <span className="text-gray-500">:</span>
        <span className={getTextColor()}>{timeLeft.seconds.toString().padStart(2, '0')}</span>
      </div>
    </div>
  );
}

