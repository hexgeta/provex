'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { usePerpetualPool } from '@/hooks/contracts/usePerpetualPool';
import { usePool } from '@/context/PoolContext';
import { Loader2, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { formatEther, parseUnits } from 'viem';
import { ConnectButton } from './ConnectButton';

interface StakeInterfaceProps {
  activeTab: 'info' | 'end' | 'claim' | 'mint';
  setActiveTab: (tab: 'info' | 'end' | 'claim' | 'mint') => void;
  onTransactionStart?: () => void;
  onTransactionEnd?: () => void;
  onTransactionSuccess?: (message: string, txHash?: string) => void;
  onTransactionError?: (error: string) => void;
}

export default function StakeInterface({
  activeTab,
  setActiveTab,
  onTransactionStart,
  onTransactionEnd,
  onTransactionSuccess,
  onTransactionError,
}: StakeInterfaceProps) {
  const { selectedPool, selectedTicker } = usePool();
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
    approveHex,
    pledgeHex,
    isLoading,
    isConnected,
    refetchBalance,
    endStaker,
    endStakeTxHash,
    chain,
    hexBalance,
    hexAllowance,
    reloadPhaseEnd,
    reloadPhaseDuration,
  } = usePerpetualPool(selectedPool.contractAddress as `0x${string}`, selectedTicker);

  const [redeemAmount, setRedeemAmount] = useState('');
  const [mintAmount, setMintAmount] = useState('');
  const [timeRemaining, setTimeRemaining] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [reloadPhaseTimeRemaining, setReloadPhaseTimeRemaining] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const redeemAmountRef = useRef<HTMLInputElement>(null);
  const mintAmountRef = useRef<HTMLInputElement>(null);

  // Threshold for showing detailed countdown (days)
  // Change this number to adjust when the HH:MM:SS countdown appears
  const COUNTDOWN_THRESHOLD_DAYS = 30;

  // Get the correct block explorer URL based on chain
  const getBlockExplorerUrl = (address: string) => {
    if (chain?.id === 1) {
      // Ethereum mainnet
      return `https://etherscan.io/address/${address}`;
    }
    // Default to PulseChain (chain ID 369)
    return `https://otter.pulsechain.com/address/${address}`;
  };

  // Get the correct transaction URL based on chain
  const getTxUrl = (txHash: string) => {
    if (chain?.id === 1) {
      // Ethereum mainnet
      return `https://etherscan.io/tx/${txHash}`;
    }
    // Default to PulseChain (chain ID 369)
    return `https://otter.pulsechain.com/tx/${txHash}`;
  };

  // Load redeem amount from localStorage when pool changes
  useEffect(() => {
    if (typeof window !== 'undefined' && selectedTicker) {
      const storageKey = `redeemAmount_${selectedTicker}`;
      const savedAmount = localStorage.getItem(storageKey);
      if (savedAmount) {
        setRedeemAmount(savedAmount);
      } else {
        setRedeemAmount(''); // Clear if switching to a pool with no saved amount
      }
    }
  }, [selectedTicker]);

  // Save redeem amount to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && selectedTicker) {
      const storageKey = `redeemAmount_${selectedTicker}`;
      if (redeemAmount) {
        localStorage.setItem(storageKey, redeemAmount);
      } else {
        localStorage.removeItem(storageKey);
      }
    }
  }, [redeemAmount, selectedTicker]);

  // Helper function to remove commas for calculations
  const removeCommas = (value: string): string => {
    return value.replace(/,/g, '');
  };

  // Helper function to format numbers with commas
  const formatNumberWithCommas = (value: string): string => {
    if (!value) return '';
    
    // Preserve trailing decimal point or zeros while typing
    if (value.endsWith('.') || value.endsWith('.0')) {
      return value;
    }
    
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    
    // If the original value has more decimal places than toLocaleString would show, preserve them
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

      // Use a more reliable approach with double requestAnimationFrame
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (inputRef.current) {
            // Calculate cursor position more intelligently
            const formattedValue = formatNumberWithCommas(rawValue);
            const originalCursorPos = input.selectionStart || 0;
            const originalValue = input.value;

            // If the user is typing at the end, keep cursor at the end
            if (originalCursorPos >= originalValue.length - 1) {
              inputRef.current.setSelectionRange(formattedValue.length, formattedValue.length);
            } else {
              // For middle positions, try to maintain relative position
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
      // HEX day is 86400 seconds (24 hours)
      // Calculate the exact Unix timestamp when the stake ends
      // HEX Day 1 started at Unix timestamp 1575331200 (Dec 3, 2019 00:00:00 UTC)
      // Stake ends at UTC midnight (00:00:00) at the START of the end day
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

  // Reload phase countdown - only when stake has ended
  useEffect(() => {
    if (stakeIsActive || !reloadPhaseEnd || !currentHexDay) {
      return;
    }

    const updateReloadCountdown = () => {
      // Reload phase ends at UTC midnight (00:00:00) at the START of the end day
      const HEX_LAUNCH_TIMESTAMP = 1575331200;
      const SECONDS_PER_DAY = 86400;
      
      const reloadEndTimestamp = HEX_LAUNCH_TIMESTAMP + (Number(reloadPhaseEnd) * SECONDS_PER_DAY);
      const now = Math.floor(Date.now() / 1000);
      const secondsRemaining = reloadEndTimestamp - now;

      if (secondsRemaining <= 0) {
        setReloadPhaseTimeRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(secondsRemaining / SECONDS_PER_DAY);
      const hours = Math.floor((secondsRemaining % SECONDS_PER_DAY) / 3600);
      const minutes = Math.floor((secondsRemaining % 3600) / 60);
      const seconds = secondsRemaining % 60;

      setReloadPhaseTimeRemaining({ days, hours, minutes, seconds });
    };

    updateReloadCountdown();
    const interval = setInterval(updateReloadCountdown, 1000);

    return () => clearInterval(interval);
  }, [reloadPhaseEnd, currentHexDay, stakeIsActive]);

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

  // Format HEX balance
  const formattedHexBalance = hexBalance 
    ? (Number(hexBalance) / 1e8).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '0.00';
  
  // Get full precision HEX balance for MAX button
  const getFullPrecisionHexBalance = () => {
    if (!hexBalance) return '0';
    const balanceStr = hexBalance.toString().padStart(9, '0');
    const whole = balanceStr.slice(0, -8) || '0';
    const decimal = balanceStr.slice(-8).replace(/0+$/, '');
    return decimal ? `${whole}.${decimal}` : whole;
  };

  // Calculate how many pool tokens will be minted
  const calculateMintableTokens = (hexAmount: string) => {
    if (!hexAmount || !hexRedemptionRate) return '0';
    try {
      const cleanAmount = removeCommas(hexAmount);
      const hexInHearts = parseFloat(cleanAmount) * 1e8;
      // Pool tokens minted = (HEX hearts * 1e8) / redemption rate
      const tokensInMini = (hexInHearts * 1e8) / Number(hexRedemptionRate);
      return (tokensInMini / 1e8).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } catch {
      return '0';
    }
  };

  // Check if minting phase is active
  const isMintingPhaseActive = currentHexDay && reloadPhaseEnd && currentHexDay <= reloadPhaseEnd && !stakeIsActive;

  const handleEndStake = async () => {
    try {
      onTransactionStart?.();
      
      // endStake now automatically fetches stake index and ID from HEX contract
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
        `Successfully redeemed ${formatNumberWithCommas(cleanAmount)} ${tokenSymbol || 'tokens'} for ${selectedPool.ticker}!`,
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

  const handleApprove = async () => {
    const cleanAmount = removeCommas(mintAmount);
    if (!cleanAmount || parseFloat(cleanAmount) <= 0) {
      onTransactionError?.('Please enter a valid amount to approve');
      return;
    }

    try {
      onTransactionStart?.();
      
      // Convert to hearts (8 decimals)
      const [whole, decimal = ''] = cleanAmount.split('.');
      const paddedDecimal = decimal.padEnd(8, '0').slice(0, 8);
      const amountInHearts = BigInt(whole + paddedDecimal);
      
      const result = await approveHex(amountInHearts);
      
      onTransactionSuccess?.(
        `Successfully approved ${formatNumberWithCommas(cleanAmount)} HEX for ${selectedPool.ticker}!`,
        result.hash
      );
    } catch (error: any) {
      console.error('Error approving HEX:', error);
      onTransactionError?.(
        error?.message || 'Failed to approve HEX. Please try again.'
      );
    } finally {
      onTransactionEnd?.();
    }
  };

  const handlePledge = async () => {
    const cleanAmount = removeCommas(mintAmount);
    if (!cleanAmount || parseFloat(cleanAmount) <= 0) {
      onTransactionError?.('Please enter a valid amount to pledge');
      return;
    }

    try {
      onTransactionStart?.();
      
      // Convert to hearts (8 decimals)
      const [whole, decimal = ''] = cleanAmount.split('.');
      const paddedDecimal = decimal.padEnd(8, '0').slice(0, 8);
      const amountInHearts = BigInt(whole + paddedDecimal);
      
      const result = await pledgeHex(amountInHearts);
      
      onTransactionSuccess?.(
        `Successfully pledged ${formatNumberWithCommas(cleanAmount)} HEX and minted ${calculateMintableTokens(cleanAmount)} ${tokenSymbol}!`,
        result.hash
      );
      
      setMintAmount('');
    } catch (error: any) {
      console.error('Error pledging HEX:', error);
      onTransactionError?.(
        error?.message || 'Failed to pledge HEX. Please try again.'
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
        <TabButton
          active={activeTab === 'mint'}
          onClick={() => setActiveTab('mint')}
          label="Mint"
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

          <div className={`space-y-6 transition-all duration-200 ${activeTab === 'end' ? 'opacity-100 visible' : 'opacity-0 invisible absolute inset-0'}`}>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">End HEX Stake</h2>
            
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
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">Burn {selectedPool.ticker}. Claim HEX.</h2>

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

              {!stakeIsActive && reloadPhaseEnd && currentHexDay && currentHexDay <= reloadPhaseEnd && (
                <div className="p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-xl">
                  <p className="text-sm text-yellow-400">Reload phase ends in:</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {reloadPhaseTimeRemaining.days}d {reloadPhaseTimeRemaining.hours}h {reloadPhaseTimeRemaining.minutes}m {reloadPhaseTimeRemaining.seconds}s
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

          <div className={`space-y-6 transition-all duration-200 ${activeTab === 'mint' ? 'opacity-100 visible' : 'opacity-0 invisible absolute inset-0'}`}>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">Pledge HEX. Mint {selectedPool.ticker}.</h2>

            <div className="space-y-4">
              <div>
                <input
                  ref={mintAmountRef}
                  type="text"
                  value={formatNumberWithCommas(mintAmount)}
                  onChange={(e) => handleAmountChange(e, setMintAmount, mintAmountRef)}
                  placeholder="0.00"
                  className="w-full bg-black border border-gray-600 rounded-lg p-3 text-white placeholder-gray-400 focus:outline-none"
                />
                
                {/* HEX Balance and MAX button */}
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-gray-400 text-xs">
                    HEX Balance: {formattedHexBalance}
                  </span>
                  <button
                    type="button"
                    onClick={() => setMintAmount(getFullPrecisionHexBalance())}
                    className="text-white hover:text-white/80 text-xs font-medium transition-colors"
                  >
                    MAX
                  </button>
                </div>
              </div>

              {mintAmount && parseFloat(removeCommas(mintAmount)) > 0 && !stakeIsActive && (
                <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-xl">
                  <p className="text-sm text-gray-400">You will receive approximately:</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {calculateMintableTokens(mintAmount)} {tokenSymbol}
                  </p>
                </div>
              )}

              {!stakeIsActive && reloadPhaseEnd && currentHexDay && currentHexDay <= reloadPhaseEnd && (
                <div className="p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-xl">
                  <p className="text-sm text-yellow-400">Reload phase ends in:</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {reloadPhaseTimeRemaining.days}d {reloadPhaseTimeRemaining.hours}h {reloadPhaseTimeRemaining.minutes}m {reloadPhaseTimeRemaining.seconds}s
                  </p>
                </div>
              )}

              {/* Check if approval is needed */}
              {mintAmount && parseFloat(removeCommas(mintAmount)) > 0 && (() => {
                const cleanAmount = removeCommas(mintAmount);
                const [whole, decimal = ''] = cleanAmount.split('.');
                const paddedDecimal = decimal.padEnd(8, '0').slice(0, 8);
                const amountInHearts = BigInt(whole + paddedDecimal);
                const needsApproval = !hexAllowance || hexAllowance < amountInHearts;

                return needsApproval ? (
                  <button
                    onClick={handleApprove}
                    disabled={isLoading || !isMintingPhaseActive}
                    className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
                      !isLoading && isMintingPhaseActive
                        ? 'bg-yellow-500 text-black hover:bg-yellow-400'
                        : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Processing...
                      </span>
                    ) : (
                      `Approve HEX`
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handlePledge}
                    disabled={isLoading || !isMintingPhaseActive}
                    className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
                      !isLoading && isMintingPhaseActive
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
                      `Mint ${tokenSymbol}`
                    )}
                  </button>
                );
              })()}

              {!isMintingPhaseActive && (
                <p className="text-sm text-yellow-400 text-center">
                  Minting is only available during the reload phase. A period of {reloadPhaseDuration ? Number(reloadPhaseDuration) : '...'} days between the stake being ended and starting once again.
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

