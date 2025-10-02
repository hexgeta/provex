'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useMaxiPool } from '@/hooks/contracts/useMaxiPool';
import { usePool } from '@/context/PoolContext';
import { Loader2, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { ConnectButton } from './ConnectButton';

interface MaxiStakeInterfaceProps {
  activeTab: 'info' | 'end' | 'claim' | 'mint';
  setActiveTab: (tab: 'info' | 'end' | 'claim' | 'mint') => void;
  onTransactionStart?: () => void;
  onTransactionEnd?: () => void;
  onTransactionSuccess?: (message: string, txHash?: string) => void;
  onTransactionError?: (error: string) => void;
}

export default function MaxiStakeInterface({
  activeTab,
  setActiveTab,
  onTransactionStart,
  onTransactionEnd,
  onTransactionSuccess,
  onTransactionError,
}: MaxiStakeInterfaceProps) {
  const { selectedPool } = usePool();
  const poolBorderColor = `${selectedPool.color}80`; // 50% opacity
  
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
    endStaker,
    endStakeTxHash,
    chain,
  } = useMaxiPool();

  const [redeemAmount, setRedeemAmount] = useState('');
  const [timeRemaining, setTimeRemaining] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const redeemAmountRef = useRef<HTMLInputElement>(null);

  // Threshold for showing detailed countdown (days)
  const COUNTDOWN_THRESHOLD_DAYS = 30;

  // MAXI contract address
  const MAXI_CONTRACT_ADDRESS = '0x0d86eb9f43c57f6ff3bc9e23d8f9d82503f0e84b';

  // Get the correct block explorer URL based on chain
  const getBlockExplorerUrl = (address: string) => {
    if (chain?.id === 1) {
      return `https://etherscan.io/address/${address}`;
    }
    return `https://otter.pulsechain.com/address/${address}`;
  };

  // Get the correct transaction URL based on chain
  const getTxUrl = (txHash: string) => {
    if (chain?.id === 1) {
      return `https://etherscan.io/tx/${txHash}`;
    }
    return `https://otter.pulsechain.com/tx/${txHash}`;
  };

  // Load redeem amount from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storageKey = `redeemAmount_MAXI`;
      const savedAmount = localStorage.getItem(storageKey);
      if (savedAmount) {
        setRedeemAmount(savedAmount);
      }
    }
  }, []);

  // Save redeem amount to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storageKey = `redeemAmount_MAXI`;
      if (redeemAmount) {
        localStorage.setItem(storageKey, redeemAmount);
      } else {
        localStorage.removeItem(storageKey);
      }
    }
  }, [redeemAmount]);

  // Helper function to remove commas for calculations
  const removeCommas = (value: string): string => {
    return value.replace(/,/g, '');
  };

  // Helper function to format numbers with commas
  const formatNumberWithCommas = (value: string): string => {
    if (!value) return '';
    
    if (value.endsWith('.') || value.endsWith('.0')) {
      return value;
    }
    
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    
    const decimalIndex = value.indexOf('.');
    if (decimalIndex !== -1) {
      const decimalPlaces = value.length - decimalIndex - 1;
      return num.toLocaleString('en-US', {
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces
      });
    }
    
    return num.toLocaleString();
  };

  // Helper function to preserve cursor position during formatting
  const handleAmountChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (value: string) => void,
    inputRef: React.RefObject<HTMLInputElement>
  ) => {
    const input = e.target;
    const rawValue = removeCommas(input.value);

    if (rawValue === '' || /^\d*\.?\d*$/.test(rawValue)) {
      setter(rawValue);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (inputRef.current) {
            const formattedValue = formatNumberWithCommas(rawValue);
            const originalCursorPos = input.selectionStart || 0;
            const originalValue = input.value;

            if (originalCursorPos >= originalValue.length - 1) {
              inputRef.current.setSelectionRange(formattedValue.length, formattedValue.length);
            } else {
              const digitsBeforeCursor = originalValue.substring(0, originalCursorPos).replace(/,/g, '').length;
              const newCursorPos = Math.min(digitsBeforeCursor, formattedValue.length);
              inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
            }
          }
        });
      });
    }
  };

  // Tab state is now managed by parent component to persist across pool changes

  // Calculate if stake can be ended
  const canEndStake = stakeIsActive && currentHexDay && stakeEndDay && currentHexDay > stakeEndDay;
  const daysUntilEnd = stakeEndDay && currentHexDay ? Number(stakeEndDay - currentHexDay) : 0;

  // Real-time countdown when less than threshold days remaining
  useEffect(() => {
    if (!stakeEndDay || !stakeIsActive || daysUntilEnd >= COUNTDOWN_THRESHOLD_DAYS) {
      return;
    }

    const updateCountdown = () => {
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

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [stakeEndDay, stakeIsActive, daysUntilEnd]);

  // Format user balance for display (2 decimals)
  const formattedBalance = userBalance 
    ? (Number(userBalance) / 1e8).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '0.00';
  
  // Get full precision balance for MAX button (8 decimals)
  const getFullPrecisionBalance = () => {
    if (!userBalance) return '0';
    const balanceStr = userBalance.toString().padStart(9, '0'); // Ensure at least 9 digits
    const whole = balanceStr.slice(0, -8) || '0';
    const decimal = balanceStr.slice(-8).replace(/0+$/, ''); // Remove trailing zeros
    return decimal ? `${whole}.${decimal}` : whole;
  };
  
  // Calculate redeemable HEX
  const calculateRedeemableHex = (amount: string) => {
    if (!amount || !hexRedemptionRate) return '0';
    try {
      const cleanAmount = removeCommas(amount);
      const amountInMini = parseFloat(cleanAmount) * 1e8;
      const redeemableHearts = (amountInMini * Number(hexRedemptionRate)) / 1e8;
      return (redeemableHearts / 1e8).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } catch {
      return '0';
    }
  };

  const handleEndStake = async () => {
    try {
      onTransactionStart?.();
      
      const result = await endStake();
      
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
    const cleanAmount = removeCommas(redeemAmount);
    if (!cleanAmount || parseFloat(cleanAmount) <= 0) {
      onTransactionError?.('Please enter a valid amount to redeem');
      return;
    }

    try {
      onTransactionStart?.();
      
      // Convert to mini (8 decimals) - handle precision carefully
      const [whole, decimal = ''] = cleanAmount.split('.');
      const paddedDecimal = decimal.padEnd(8, '0').slice(0, 8);
      const amountInMini = BigInt(whole + paddedDecimal);
      
      const result = await redeemHex(amountInMini);
      
      onTransactionSuccess?.(
        `Successfully redeemed ${formatNumberWithCommas(cleanAmount)} ${tokenSymbol || 'tokens'} for MAXI!`,
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
      <div className="flex items-center justify-center min-h-[400px]">
        <ConnectButton />
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto mt-4">
      {/* Tab Navigation */}
      <div className="flex justify-center gap-2 mb-0 text-md md:text-lg">
        <TabButton
          active={activeTab === 'info'}
          onClick={() => setActiveTab('info')}
          label="Stake Info"
          borderColor={poolBorderColor}
        />
        <TabButton
          active={activeTab === 'end'}
          onClick={() => setActiveTab('end')}
          label="End The Stake"
          borderColor={poolBorderColor}
        />
        <TabButton
          active={activeTab === 'claim'}
          onClick={() => setActiveTab('claim')}
          label="Claim HEX"
          borderColor={poolBorderColor}
        />
      </div>

      {/* Content Area */}
      <div 
        className="bg-black border-2 rounded-2xl p-6 md:p-8"
        style={{ borderColor: poolBorderColor }}
      >
        <div className="relative">
          <div className={`space-y-6 transition-all duration-200 ${activeTab === 'info' ? 'opacity-100 visible' : 'opacity-0 invisible absolute inset-0'}`}>
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
            
            <div className="mt-6 p-4 bg-blue-900/20 border-1 border-blue-500/30 rounded-xl">
              <h3 className="text-lg font-semibold text-white mb-2">Contract Address</h3>
              <div className="flex items-center gap-2">
                <code className="text-sm text-gray-300 break-all">{MAXI_CONTRACT_ADDRESS}</code>
                <a
                  href={getBlockExplorerUrl(MAXI_CONTRACT_ADDRESS)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>

          <div className={`space-y-6 transition-all duration-200 ${activeTab === 'end' ? 'opacity-100 visible' : 'opacity-0 invisible absolute inset-0'}`}>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">End HEX Stake</h2>
            
            <div className="p-0 bg-gray-900/20 rounded-xl">
              <p className="text-gray-300 mb-2">
                Once the stake period has ended, anyone can trigger the stake ending process. This only needs to happen once.
                Once the stake has been ended you can redeem your HEX principle & yield from the next "Claim your HEX" tab.
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
                            Stake cannot be ended yet. Stake ends in: {' '}
                            <span className="font-mono">
                              {timeRemaining.days > 0 && `${timeRemaining.days}d `}
                              {String(timeRemaining.hours).padStart(2, '0')}h{' '}
                              {String(timeRemaining.minutes).padStart(2, '0')}m{' '}
                              {String(timeRemaining.seconds).padStart(2, '0')}s
                            </span>
                          </>
                        : `Stake cannot be ended yet. Stake ends in: ${daysUntilEnd} days.`
                      : 'Stake is not currently active or has already been ended.'}
                  </span>
                </div>
              )}
            </div>

            {!stakeIsActive && endStaker && endStaker !== '0x0000000000000000000000000000000000000000' && (
              <div className="p-4 bg-gradient-to-r from-yellow-900/20 to-amber-900/20 border-2 border-yellow-600/50 rounded-xl">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">👑</span>
                  <div className="flex-1 space-y-3">
                    <div>
                      <p className="text-yellow-400 font-semibold mb-2">Stake Ended By:</p>
                      <a
                        href={getBlockExplorerUrl(endStaker)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white hover:text-yellow-400 transition-colors font-mono text-sm break-all flex items-center gap-2"
                      >
                        {endStaker}
                        <ExternalLink className="w-4 h-4 flex-shrink-0" />
                      </a>
                    </div>
                    {endStakeTxHash && (
                      <div>
                        <p className="text-yellow-400 font-semibold mb-2">Tx:</p>
                        <a
                          href={getTxUrl(endStakeTxHash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white hover:text-yellow-400 transition-colors font-mono text-sm break-all flex items-center gap-2"
                        >
                          {endStakeTxHash}
                          <ExternalLink className="w-4 h-4 flex-shrink-0" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {stakeIsActive && (
              <button
                onClick={handleEndStake}
                disabled={!canEndStake || isLoading}
                className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
                  canEndStake && !isLoading
                    ? 'bg-white text-black hover:bg-gray-200'
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
            )}
          </div>

          <div className={`space-y-6 transition-all duration-200 ${activeTab === 'claim' ? 'opacity-100 visible' : 'opacity-0 invisible absolute inset-0'}`}>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">Burn MAXI. Claim HEX.</h2>

            <div className="space-y-4">
              <div>
                <input
                  ref={redeemAmountRef}
                  type="text"
                  value={formatNumberWithCommas(redeemAmount)}
                  onChange={(e) => handleAmountChange(e, setRedeemAmount, redeemAmountRef)}
                  placeholder="0.00"
                  className="w-full bg-black border border-gray-600 rounded-lg p-3 text-white placeholder-gray-400 focus:outline-none"
                />
                
                {/* Balance and MAX button */}
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-gray-400 text-xs">
                    Balance: {formattedBalance} {tokenSymbol || ''}
                  </span>
                  <button
                    type="button"
                    onClick={() => setRedeemAmount(getFullPrecisionBalance())}
                    className="text-white hover:text-white/80 text-xs font-medium transition-colors"
                  >
                    MAX
                  </button>
                </div>
              </div>

              {redeemAmount && parseFloat(removeCommas(redeemAmount)) > 0 && !stakeIsActive && (
                <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-xl">
                  <p className="text-sm text-gray-400">You will receive approximately:</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {calculateRedeemableHex(redeemAmount)} HEX
                  </p>
                </div>
              )}

              <button
                onClick={handleRedeem}
                disabled={!redeemAmount || parseFloat(removeCommas(redeemAmount)) <= 0 || isLoading || stakeIsActive}
                className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
                  redeemAmount && parseFloat(removeCommas(redeemAmount)) > 0 && !isLoading && !stakeIsActive
                    ? 'bg-white text-black hover:bg-gray-200'
                    : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </span>
                ) : (
                  `Redeem Your HEX`
                )}
              </button>

              {stakeIsActive && (
                <p className="text-sm text-yellow-400 text-center">
                  Redemption is only available after the stake has ended.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, label, borderColor }: { active: boolean; onClick: () => void; label: string; borderColor: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-3 rounded-t-xl font-semibold relative ${
        active
          ? 'bg-black border-2 border-b-0 text-white z-10 mb-[-2px] after:content-[""] after:absolute after:bottom-[-2px] after:left-0 after:right-0 after:h-[2px] after:bg-black'
          : 'bg-transparent text-gray-500 hover:text-gray-300'
      }`}
      style={active ? { borderColor } : undefined}
    >
      {label}
    </button>
  );
}

function InfoRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`flex justify-between items-center py-3 border-b border-gray-900 ${highlight ? 'bg-yellow-900/20 px-4 rounded-lg' : ''}`}>
      <span className="text-gray-400">{label}</span>
      <span className={`font-semibold ${highlight ? 'text-yellow-400' : 'text-white'}`}>{value}</span>
    </div>
  );
}


