'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { usePerpetualPool } from '@/hooks/contracts/usePerpetualPool';
import { usePool } from '@/context/PoolContext';
import { Loader2, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { formatEther, parseUnits } from 'viem';

interface StakeInterfaceProps {
  onTransactionStart?: () => void;
  onTransactionEnd?: () => void;
  onTransactionSuccess?: (message: string, txHash?: string) => void;
  onTransactionError?: (error: string) => void;
}

export default function StakeInterface({
  onTransactionStart,
  onTransactionEnd,
  onTransactionSuccess,
  onTransactionError,
}: StakeInterfaceProps) {
  const { selectedPool, selectedTicker } = usePool();
  
  const {
    stakeIsActive,
    stakeEndDay,
    currentHexDay,
    hexRedemptionRate,
    userBalance,
    tokenSymbol,
    tokenName,
    endStake,
    redeemHex,
    isLoading,
    isConnected,
    refetchBalance,
  } = usePerpetualPool(selectedPool.contractAddress, selectedTicker);

  const [redeemAmount, setRedeemAmount] = useState('');
  const [activeTab, setActiveTab] = useState<'info' | 'end' | 'claim'>('end');
  const [timeRemaining, setTimeRemaining] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  // Threshold for showing detailed countdown (days)
  // Change this number to adjust when the HH:MM:SS countdown appears
  const COUNTDOWN_THRESHOLD_DAYS = 30;

  // Set default tab based on stake status
  useEffect(() => {
    if (stakeIsActive === true) {
      setActiveTab('end');
    } else if (stakeIsActive === false) {
      setActiveTab('claim');
    }
  }, [stakeIsActive]);

  // Calculate if stake can be ended
  const canEndStake = stakeIsActive && currentHexDay && stakeEndDay && currentHexDay > stakeEndDay;
  const daysUntilEnd = stakeEndDay && currentHexDay ? Number(stakeEndDay - currentHexDay) : 0;

  // Real-time countdown when less than threshold days remaining
  useEffect(() => {
    if (!stakeEndDay || !stakeIsActive || daysUntilEnd >= COUNTDOWN_THRESHOLD_DAYS) {
      return;
    }

    const updateCountdown = () => {
      // HEX day is 86400 seconds (24 hours)
      // Calculate the exact Unix timestamp when the stake ends
      // HEX Day 1 started at Unix timestamp 1575331200 (Dec 3, 2019 00:00:00 UTC)
      const HEX_LAUNCH_TIMESTAMP = 1575331200;
      const SECONDS_PER_DAY = 86400;
      
      const stakeEndTimestamp = HEX_LAUNCH_TIMESTAMP + (Number(stakeEndDay) * SECONDS_PER_DAY);
      const now = Math.floor(Date.now() / 1000);
      const secondsRemaining = stakeEndTimestamp - now;

      if (secondsRemaining <= 0) {
        setTimeRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(secondsRemaining / SECONDS_PER_DAY);
      const hours = Math.floor((secondsRemaining % SECONDS_PER_DAY) / 3600);
      const minutes = Math.floor((secondsRemaining % 3600) / 60);
      const seconds = secondsRemaining % 60;

      setTimeRemaining({ days, hours, minutes, seconds });
    };

    // Initial update
    updateCountdown();

    // Update every second
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [stakeEndDay, stakeIsActive, daysUntilEnd]);

  // Format user balance
  const formattedBalance = userBalance ? (Number(userBalance) / 1e8).toFixed(2) : '0.00';
  
  // Calculate redeemable HEX
  const calculateRedeemableHex = (amount: string) => {
    if (!amount || !hexRedemptionRate) return '0';
    try {
      const amountInMini = parseFloat(amount) * 1e8;
      const redeemableHearts = (amountInMini * Number(hexRedemptionRate)) / 1e8;
      return (redeemableHearts / 1e8).toFixed(2);
    } catch {
      return '0';
    }
  };

  const handleEndStake = async () => {
    try {
      onTransactionStart?.();
      
      // For ending stake, you'll need to provide the correct stakeIndex and stakeIdParam
      // These can be found by querying the HEX contract's stakeLists mapping
      // For now, using placeholder values - you'll need to update these
      const stakeIndex = 0n; // This should be queried from the HEX contract
      const stakeIdParam = 0; // This should be queried from the HEX contract
      
      const result = await endStake(stakeIndex, stakeIdParam);
      
      onTransactionSuccess?.(
        'Stake ended successfully! HEX has been distributed to the pool.',
        result.hash
      );
    } catch (error: any) {
      console.error('Error ending stake:', error);
      onTransactionError?.(
        error?.message || 'Failed to end stake. Please try again.'
      );
    } finally {
      onTransactionEnd?.();
    }
  };

  const handleRedeem = async () => {
    if (!redeemAmount || parseFloat(redeemAmount) <= 0) {
      onTransactionError?.('Please enter a valid amount to redeem');
      return;
    }

    try {
      onTransactionStart?.();
      
      // Convert to mini (8 decimals)
      const amountInMini = BigInt(Math.floor(parseFloat(redeemAmount) * 1e8));
      
      const result = await redeemHex(amountInMini);
      
      onTransactionSuccess?.(
        `Successfully redeemed ${redeemAmount} ${tokenSymbol || 'tokens'} for ${selectedPool.ticker}!`,
        result.hash
      );
      
      setRedeemAmount('');
      await refetchBalance();
    } catch (error: any) {
      console.error('Error redeeming:', error);
      onTransactionError?.(
        error?.message || 'Failed to redeem tokens. Please try again.'
      );
    } finally {
      onTransactionEnd?.();
    }
  };

  if (!isConnected) {
    return (
      <div className="w-full max-w-4xl mx-auto mt-8">
        <div className="bg-black/40 border border-white/10 rounded-2xl p-8 text-center">
          <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-white mb-2">Wallet Not Connected</h3>
          <p className="text-gray-400">Please connect your wallet to interact with the stake pool</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto mt-8">
      {/* Tab Navigation */}
      <div className="flex justify-center gap-2 mb-6">
        <TabButton
          active={activeTab === 'info'}
          onClick={() => setActiveTab('info')}
          label="Stake Info"
        />
        <TabButton
          active={activeTab === 'end'}
          onClick={() => setActiveTab('end')}
          label="End The Stake"
        />
        <TabButton
          active={activeTab === 'claim'}
          onClick={() => setActiveTab('claim')}
          label="Claim Your HEX"
        />
      </div>

      {/* Content Area */}
      <div className="bg-black/40 border border-white/10 rounded-2xl p-6 md:p-8">
        {activeTab === 'info' && (
          <div className="space-y-6">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">Pool Information</h2>
            
            <InfoRow label="Pool Name" value={tokenName || 'Loading...'} />
            <InfoRow label="Pool Token" value={tokenSymbol || 'Loading...'} />
            <InfoRow label="Your Balance" value={`${formattedBalance} ${tokenSymbol || ''}`} />
            <InfoRow label="Stake Status" value={stakeIsActive ? 'Active' : 'Ended/Not Started'} />
            <InfoRow label="Current HEX Day" value={currentHexDay ? currentHexDay.toString() : 'Loading...'} />
            <InfoRow label="Stake End Day" value={stakeEndDay ? stakeEndDay.toString() : 'Loading...'} />
            
            {daysUntilEnd > 0 && (
              <InfoRow label="Days Until End" value={daysUntilEnd.toString()} highlight />
            )}
            
            <div className="mt-6 p-4 bg-blue-900/20 border border-blue-500/30 rounded-xl">
              <h3 className="text-lg font-semibold text-white mb-2">Contract Address</h3>
              <div className="flex items-center gap-2">
                <code className="text-sm text-gray-300 break-all">{selectedPool.contractAddress}</code>
                <a
                  href={`https://otter.pulsechain.com/address/${selectedPool.contractAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'end' && (
          <div className="space-y-6">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">End HEX Stake</h2>
            
            <div className="p-4 bg-purple-900/20 border border-purple-500/30 rounded-xl">
              <p className="text-gray-300 mb-4">
                Once the stake period has ended, anyone can trigger the stake ending process. 
                This will distribute the HEX rewards to the pool and allow token holders to claim their share.
              </p>
              
              {canEndStake ? (
                <div className="flex items-center gap-2 text-green-400 mb-4">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Stake is ready to be ended!</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-yellow-400 mb-4">
                  <AlertCircle className="w-5 h-5" />
                  <span>
                    {stakeIsActive 
                      ? daysUntilEnd < COUNTDOWN_THRESHOLD_DAYS
                        ? <>
                            Stake cannot be ended yet. {' '}
                            <span className="font-mono">
                              {timeRemaining.days > 0 && `${timeRemaining.days}d `}
                              {String(timeRemaining.hours).padStart(2, '0')}h{' '}
                              {String(timeRemaining.minutes).padStart(2, '0')}m{' '}
                              {String(timeRemaining.seconds).padStart(2, '0')}s
                            </span>
                          </>
                        : `Stake cannot be ended yet. ${daysUntilEnd} days remaining.`
                      : 'Stake is not currently active or has already been ended.'}
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={handleEndStake}
              disabled={!canEndStake || isLoading}
              className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
                canEndStake && !isLoading
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white'
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </span>
              ) : (
                'End Stake'
              )}
            </button>

            <p className="text-sm text-gray-500 text-center">
              Note: You'll need to provide the correct stakeIndex and stakeId from the HEX contract
            </p>
          </div>
        )}

        {activeTab === 'claim' && (
          <div className="space-y-6">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">Claim {selectedPool.ticker} Tokens</h2>
            
            <div className="p-4 bg-green-900/20 border border-green-500/30 rounded-xl">
              <p className="text-gray-300 mb-2">
                Burn your {tokenSymbol || 'pool tokens'} to receive your pro-rata share of {selectedPool.ticker} tokens from the pool.
              </p>
              <p className="text-sm text-gray-400">
                Your balance: <span className="text-white font-semibold">{formattedBalance} {tokenSymbol || ''}</span>
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Amount to Redeem ({tokenSymbol || 'Tokens'})
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={redeemAmount}
                    onChange={(e) => setRedeemAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-4 py-3 bg-black/60 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                    step="0.01"
                  />
                  <button
                    onClick={() => setRedeemAmount(formattedBalance)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-purple-600/50 hover:bg-purple-600 rounded-lg text-sm font-medium text-white transition-colors"
                  >
                    MAX
                  </button>
                </div>
              </div>

              {redeemAmount && (
                <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-xl">
                  <p className="text-sm text-gray-400">You will receive approximately:</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {calculateRedeemableHex(redeemAmount)} {selectedPool.ticker}
                  </p>
                </div>
              )}

              <button
                onClick={handleRedeem}
                disabled={!redeemAmount || parseFloat(redeemAmount) <= 0 || isLoading || stakeIsActive}
                className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
                  redeemAmount && parseFloat(redeemAmount) > 0 && !isLoading && !stakeIsActive
                    ? `bg-gradient-to-r ${selectedPool.gradientFrom} ${selectedPool.gradientTo} hover:opacity-90 text-white`
                    : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </span>
                ) : (
                  `Redeem Your HEX Tokens`
                )}
              </button>

              {stakeIsActive && (
                <p className="text-sm text-yellow-400 text-center">
                  Redemption is only available when the stake is not active
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-3 rounded-t-xl font-semibold transition-all ${
        active
          ? 'bg-black/40 border border-b-0 border-white/10 text-white'
          : 'bg-transparent text-gray-500 hover:text-gray-300'
      }`}
    >
      {label}
    </button>
  );
}

function InfoRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`flex justify-between items-center py-3 border-b border-white/10 ${highlight ? 'bg-yellow-900/20 px-4 rounded-lg' : ''}`}>
      <span className="text-gray-400">{label}</span>
      <span className={`font-semibold ${highlight ? 'text-yellow-400' : 'text-white'}`}>{value}</span>
    </div>
  );
}

