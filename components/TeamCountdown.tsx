'use client';

import { useState, useEffect } from 'react';
import { Address } from 'viem';
import { usePerpetualPool } from '@/hooks/contracts/usePerpetualPool';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

// BASE Pool address
const BASE_POOL_ADDRESS = '0x7487fd45F9e7B8C2fA87063ba98067a20E0bdb58' as Address;

// HEX day is 24 hours, starts at Unix timestamp 1575331200 (Dec 3, 2019 00:00:00 UTC)
const HEX_LAUNCH_TIME = 1575331200;
const DAY_IN_SECONDS = 86400;

export default function TeamCountdown() {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 });
  const [label, setLabel] = useState<string>('');

  // Use cached BASE pool data
  const { 
    stakeEndDay, 
    reloadPhaseEnd, 
    stakeIsActive,
    currentHexDay 
  } = usePerpetualPool(BASE_POOL_ADDRESS, 'BASE');

  useEffect(() => {
    // Don't start timer until we have the data
    if (!stakeEndDay || !reloadPhaseEnd || stakeIsActive === undefined) {
      return;
    }

    const calculateTimeLeft = (): TimeLeft => {
      // Determine target HEX day based on stake status
      const targetHexDay = stakeIsActive ? stakeEndDay : reloadPhaseEnd;
      const newLabel = stakeIsActive ? 'Time Until End' : 'Time Until Restart';
      
      setLabel(newLabel);
      
      // Calculate target deadline as JavaScript Date
      const targetUnixTimestampMs = (HEX_LAUNCH_TIME + (Number(targetHexDay) * DAY_IN_SECONDS)) * 1000;
      const deadline = new Date(targetUnixTimestampMs);
      const now = new Date();
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
  }, [stakeEndDay, reloadPhaseEnd, stakeIsActive]);

  // Show loading if data hasn't loaded yet
  if (!stakeEndDay || !reloadPhaseEnd || stakeIsActive === undefined) {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-700/30 bg-black">
        <span className="text-sm font-semibold text-gray-400">Loading...</span>
      </div>
    );
  }

  // Show expired message if countdown has ended
  if (timeLeft.total <= 0) {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-700/30 bg-black">
        <span className="text-sm font-semibold text-gray-400">Updating...</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10">
      <span className="text-xs text-gray-400">{label}:</span>
      <div className="flex items-center gap-1 font-mono text-sm font-semibold">
        {timeLeft.days > 0 && (
          <>
            <span className="text-yellow-500">{timeLeft.days}</span>
            <span className="text-gray-500 text-xs">d</span>
          </>
        )}
        <span className="text-yellow-500">{timeLeft.hours.toString().padStart(2, '0')}</span>
        <span className="text-gray-500">:</span>
        <span className="text-yellow-500">{timeLeft.minutes.toString().padStart(2, '0')}</span>
        <span className="text-gray-500">:</span>
        <span className="text-yellow-500">{timeLeft.seconds.toString().padStart(2, '0')}</span>
      </div>
    </div>
  );
}
