'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

export default function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 });

  useEffect(() => {
    // Target: Midnight UTC between Oct 11 and Oct 12, 2025
    const targetDate = new Date('2025-10-12T00:00:00Z');

    const calculateTimeLeft = (): TimeLeft => {
      const now = new Date();
      const difference = targetDate.getTime() - now.getTime();

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
  }, []);

  const isExpired = timeLeft.total <= 0;

  return (
    <div className="w-full max-w-4xl mx-auto mb-8">
      <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-2xl p-6 md:p-8">
        <h3 className="text-xl md:text-2xl font-bold text-white text-center mb-4">
          {isExpired ? 'Stake Pool Has Ended!' : 'Time Until Stake Pool Ends'}
        </h3>
        
        {!isExpired && (
          <div className="grid grid-cols-4 gap-2 md:gap-4">
            <TimeUnit value={timeLeft.days} label="Days" />
            <TimeUnit value={timeLeft.hours} label="Hours" />
            <TimeUnit value={timeLeft.minutes} label="Minutes" />
            <TimeUnit value={timeLeft.seconds} label="Seconds" />
          </div>
        )}

        <div className="mt-6 text-center">
          <p className="text-sm md:text-base text-gray-400">
            Deadline: <span className="text-white font-semibold">October 12, 2025 00:00:00 UTC</span>
          </p>
          {!isExpired && (
            <p className="text-xs md:text-sm text-gray-500 mt-2">
              End your stake before the deadline to claim your TRIO tokens
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

interface TimeUnitProps {
  value: number;
  label: string;
}

function TimeUnit({ value, label }: TimeUnitProps) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center bg-black/40 border border-white/10 rounded-xl p-3 md:p-4"
      whileHover={{ scale: 1.05 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <div className="text-3xl md:text-5xl font-bold text-white tabular-nums">
        {value.toString().padStart(2, '0')}
      </div>
      <div className="text-xs md:text-sm text-gray-400 mt-1 uppercase tracking-wider">
        {label}
      </div>
    </motion.div>
  );
}

