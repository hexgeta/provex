'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useMaxiPool } from '@/hooks/contracts/useMaxiPool';
import { usePool } from '@/context/PoolContext';
import { Loader2, CheckCircle2, AlertCircle, ExternalLink, ChevronDown } from 'lucide-react';
import { ConnectButton } from './ConnectButton';
import { formatHexDayToUTCDate } from '@/utils/format';
import { 
  validateAmount, 
  removeCommas, 
  formatNumberWithCommas,
  isValidNumberInput,
  amountToBigInt 
} from '@/utils/validation';

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
    stakeStartDay,
    currentHexDay,
    hexRedemptionRate,
    userBalance,
    tokenSymbol,
    tokenName,
    endStake,
    mintHedron,
    redeemHex,
    isLoading,
    isConnected,
    refetchBalance,
    endStaker,
    endStakeTxHash,
    chain,
    stakeInfo,
    hasHedronMinted,
    claimableHedron,
  } = useMaxiPool();

  // 🔍 LOG: MaxiStakeInterface received data
  console.log('🔍 [MaxiStakeInterface] Received data from useMaxiPool', {
    selectedPoolTicker: selectedPool.ticker,
    tokenName,
    tokenSymbol,
    stakeStartDay: stakeStartDay?.toString(),
    currentHexDay: currentHexDay?.toString(),
    stakeEndDay: stakeEndDay?.toString(),
    stakeIsActive,
    userBalance: userBalance?.toString(),
    isConnected,
    chainId: chain?.id,
    chainName: chain?.name,
  });

  const [redeemAmount, setRedeemAmount] = useState('');
  const [timeRemaining, setTimeRemaining] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isMintingHedron, setIsMintingHedron] = useState(false); // Loading state for minting hedron
  const [isEndingStake, setIsEndingStake] = useState(false); // Loading state for ending stake
  const redeemAmountRef = useRef<HTMLInputElement>(null);
  
  // Scroll indicator states
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);
  const infoScrollRef = useRef<HTMLDivElement>(null);

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

  // Check if content is scrollable and track scroll position
  useEffect(() => {
    const checkScroll = () => {
      if (infoScrollRef.current && activeTab === 'info') {
        const { scrollHeight, clientHeight, scrollTop } = infoScrollRef.current;
        const isScrollable = scrollHeight > clientHeight;
        const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 10;
        setShowScrollIndicator(isScrollable && !isAtBottom);
      }
    };

    checkScroll();
    const scrollElement = infoScrollRef.current;
    if (scrollElement) {
      scrollElement.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
    }

    return () => {
      if (scrollElement) {
        scrollElement.removeEventListener('scroll', checkScroll);
      }
      window.removeEventListener('resize', checkScroll);
    };
  }, [activeTab, stakeIsActive, currentHexDay, stakeEndDay]);

  // Helper function to preserve cursor position during formatting
  const handleAmountChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (value: string) => void,
    inputRef: React.RefObject<HTMLInputElement>
  ) => {
    const input = e.target;
    const rawValue = removeCommas(input.value);

    // Use validation utility for input checking
    if (rawValue === '' || isValidNumberInput(rawValue, 8)) {
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

  // Real-time countdown - always active when stake is active
  useEffect(() => {
    if (!stakeIsActive) {
      return;
    }

    const updateCountdown = () => {
      // Use hardcoded deadline from PERPETUAL_POOLS config
      const deadline = new Date(selectedPool.deadlineUTC);
      const now = new Date();
      const secondsRemaining = Math.floor((deadline.getTime() - now.getTime()) / 1000);

      if (secondsRemaining <= 0) {
        setTimeRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const SECONDS_PER_DAY = 86400;
      const days = Math.floor(secondsRemaining / SECONDS_PER_DAY);
      const hours = Math.floor((secondsRemaining % SECONDS_PER_DAY) / 3600);
      const minutes = Math.floor((secondsRemaining % 3600) / 60);
      const seconds = secondsRemaining % 60;

      setTimeRemaining({ days, hours, minutes, seconds });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [selectedPool.deadlineUTC, stakeIsActive]);

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

  const handleMintHedron = async () => {
    if (!stakeInfo) {
      onTransactionError?.('Stake information not available. Please refresh and try again.');
      return;
    }

    setIsMintingHedron(true);
    try {
      onTransactionStart?.();
      
      const stakeIndex = 0n;
      const stakeIdParam = Number(stakeInfo[0]); // First element is stakeId
      
      const result = await mintHedron(stakeIndex, stakeIdParam);
      
      onTransactionSuccess?.(
        'Hedron minted successfully! You can now end the stake.',
        result.hash
      );
    } catch (error: any) {
      // If error says already minted, show success message
      if (error?.message?.includes('already') || error?.message?.includes('minted')) {
        onTransactionSuccess?.('Hedron has already been minted for this stake.');
      } else {
        onTransactionError?.(
          error?.message || 'Failed to mint Hedron. Please try again.'
        );
      }
    } finally {
      setIsMintingHedron(false);
      onTransactionEnd?.();
    }
  };

  const handleEndStake = async () => {
    setIsEndingStake(true);
    try {
      onTransactionStart?.();
      
      const result = await endStake();
      
      onTransactionSuccess?.(
        'Stake ended successfully! HEX has been distributed to the pool.',
        result.hash
      );
    } catch (error: any) {
      onTransactionError?.(
        error?.message || 'Failed to end stake. Please try again.'
      );
    } finally {
      setIsEndingStake(false);
      onTransactionEnd?.();
    }
  };

  const handleRedeem = async () => {
    // Validate amount using centralized validation
    const validation = validateAmount(redeemAmount, {
      fieldName: 'Redeem amount',
      maxBalance: (Number(userBalance || 0n) / 1e8).toString(),
      maxDecimals: 8
    });
    
    if (!validation.isValid) {
      onTransactionError?.(validation.error || 'Please enter a valid amount to redeem');
      return;
    }

    const cleanAmount = removeCommas(redeemAmount);

    try {
      onTransactionStart?.();
      
      // Convert to mini (8 decimals) using safe conversion
      const conversion = amountToBigInt(cleanAmount, 8);
      if (!conversion.success) {
        onTransactionError?.(conversion.error);
        return;
      }
      
      const result = await redeemHex(conversion.value);
      
      onTransactionSuccess?.(
        `Successfully redeemed ${formatNumberWithCommas(cleanAmount)} ${tokenSymbol || 'tokens'} for MAXI!`,
        result.hash
      );
      
      setRedeemAmount('');
      await refetchBalance();
    } catch (error: any) {
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
      <div className="flex justify-center gap-2 mb-0 text-[10px] sm:text-lg">
        <TabButton
          active={activeTab === 'info'}
          onClick={() => setActiveTab('info')}
          label="Stake Info"
          borderColor={poolBorderColor}
        />
        <TabButton
          active={activeTab === 'end'}
          onClick={() => setActiveTab('end')}
          label="End Stake"
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
        className="bg-black/10 backdrop-blur-[3px] border-2 rounded-2xl p-6 md:p-8"
        style={{ borderColor: poolBorderColor }}
      >
        <div className="relative">
          <div 
            ref={infoScrollRef}
            className={`space-y-6 transition-all duration-200 max-h-[70vh] overflow-y-auto scrollbar-hide ${activeTab === 'info' ? 'opacity-100 visible' : 'opacity-0 invisible absolute inset-0'}`}
          >
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">Pool Information</h2>
            
            <InfoRow label="Pool Name" value={tokenName || 'Loading...'} />
            <InfoRow label="Pool Token" value={tokenSymbol || 'Loading...'} />
            <InfoRow label="Your Balance" value={`${formattedBalance} ${tokenSymbol || ''}`} />
            <InfoRow label="Stake Status" value={stakeIsActive ? 'Active' : 'Ended/Not Started'} />
            
            <div className="flex justify-between items-center py-3 border-b border-gray-900">
              <span className="text-gray-400">Stake Start Day</span>
              <div className="flex flex-col items-end">
                <span className="font-semibold text-white">
                  {stakeStartDay ? formatHexDayToUTCDate(stakeStartDay) : 'Loading...'}
                </span>
                {stakeStartDay && (
                  <span className="text-gray-500 text-xs mt-1">HEX Day {stakeStartDay.toString()}</span>
                )}
              </div>
            </div>
            
            <InfoRow label="Current Day" value={currentHexDay ? formatHexDayToUTCDate(currentHexDay) : 'Loading...'} />
            
            <div className="flex justify-between items-center py-3 border-b border-gray-900">
              <span className="text-gray-400">Stake End Day</span>
              <div className="flex flex-col items-end">
                <span className="font-semibold text-white">
                  <span className="text-gray-500 text-sm mr-2">23:59 UTC</span>
                  {(() => {
                    // Subtract 1 minute to show 23:59 of the day before
                    const deadline = new Date(selectedPool.deadlineUTC);
                    deadline.setMinutes(deadline.getMinutes() - 1);
                    const day = deadline.getUTCDate();
                    const month = deadline.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
                    const year = deadline.getUTCFullYear();
                    return `${day} ${month} ${year}`;
                  })()}
                </span>
                {stakeEndDay && (
                  <span className="text-gray-500 text-xs mt-1">HEX Day {(Number(stakeEndDay) + 2).toString()}</span>
                )}
              </div>
            </div>
            
            {daysUntilEnd > 0 && (
              <>
                <InfoRow 
                  label="Time Until End" 
                  value={`${timeRemaining.days.toLocaleString('en-US')}d ${String(timeRemaining.hours).padStart(2, '0')}h ${String(timeRemaining.minutes).padStart(2, '0')}m ${String(timeRemaining.seconds).padStart(2, '0')}s`} 
                  highlight 
                />
                
                {(() => {
                  const totalDays = timeRemaining.days;
                  const totalHours = totalDays * 24 + timeRemaining.hours;
                  const totalMinutes = totalHours * 60 + timeRemaining.minutes;
                  
                  let progressPercent = 0;
                  let progressLabel = '';
                  let showProgress = false;
                  
                  if (totalDays <= 7 && totalDays > 0) {
                    // Show last 7 days progress (only when within 7 days)
                    const hoursIn7Days = 7 * 24;
                    const hoursElapsedIn7Days = hoursIn7Days - totalHours;
                    progressPercent = (hoursElapsedIn7Days / hoursIn7Days) * 100;
                    progressLabel = 'Last 7 Days';
                    showProgress = true;
                  } else if (totalDays === 0 && totalHours > 1) {
                    // Show last 24 hours progress (only when within 24 hours)
                    const hoursInDay = 24;
                    const hoursElapsedInDay = hoursInDay - totalHours;
                    progressPercent = (hoursElapsedInDay / hoursInDay) * 100;
                    progressLabel = 'Last 24 Hours';
                    showProgress = true;
                  } else if (totalDays === 0 && totalHours <= 1) {
                    // Show last hour progress (only when within 1 hour)
                    const minutesInHour = 60;
                    const minutesElapsedInHour = minutesInHour - totalMinutes;
                    progressPercent = (minutesElapsedInHour / minutesInHour) * 100;
                    progressLabel = 'Last Hour';
                    showProgress = true;
                  }
                  
                  if (!showProgress) return null;
                  
                  return (
                    <div className="py-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-400 text-sm">{progressLabel}</span>
                        <span className="text-gray-400 text-sm">{progressPercent.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-2">
                        <div 
                          className="bg-yellow-400 h-2 rounded-full transition-all duration-1000"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  );
                })()}
              </>
            )}
            
            <a
              href={getBlockExplorerUrl(MAXI_CONTRACT_ADDRESS)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 p-4 bg-blue-900/20 border-1 border-blue-500/30 rounded-xl block hover:bg-blue-900/30 transition-colors cursor-pointer"
            >
              <h3 className="text-lg font-semibold text-white mb-2">Contract Address</h3>
              <div className="flex items-center gap-2">
                <code className="text-sm text-gray-300 break-all">{MAXI_CONTRACT_ADDRESS}</code>
                <ExternalLink className="w-4 h-4 text-blue-400" />
              </div>
            </a>
          </div>

          {/* Scroll indicator */}
          {showScrollIndicator && activeTab === 'info' && (
            <div className="absolute bottom-0 mb-[-10px] left-1/2 -translate-x-1/2 pointer-events-none z-10">
              <ChevronDown className="w-6 h-6 text-white/60" />
            </div>
          )}

          <div className={`space-y-6 transition-all duration-200 ${activeTab === 'end' ? 'opacity-100 visible' : 'opacity-0 invisible absolute inset-0'}`}>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">End HEX Stake</h2>
            
            <div className="p-0 bg-gray-900/20 rounded-xl">
              <p className="text-gray-300 mb-2">
                Once the stake period has ended, anyone can trigger the stake ending process. This only needs to happen once.
                Once the stake has been ended you can redeem your HEX principle & yield from the next "Claim HEX" tab.
              </p>
              
              {canEndStake ? (
                <div className="flex items-center gap-2 text-green-400 mb-4">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Stake is ready to be ended!</span>
                </div>
              ) : (
                <div className="flex items-start gap-2 text-yellow-400 mb-4 leading-5">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="leading-5">
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
              <div className="space-y-4">
                {/* Show Mint Hedron button if there's Hedron to claim */}
                {claimableHedron > 0n && (
                  <div className="space-y-2">
                    <button
                      onClick={handleMintHedron}
                      disabled={!canEndStake || isMintingHedron || isEndingStake}
                      className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
                        canEndStake && !isMintingHedron && !isEndingStake
                          ? 'bg-[#2D82F3] text-white hover:bg-[#3D92FF]'
                          : 'bg-gray-700 text-gray-400 cursor-not-allowed opacity-50'
                      }`}
                    >
                      {isMintingHedron ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Processing...
                        </span>
                      ) : (
                        'Mint Hedron'
                      )}
                    </button>
                    {/* Only show claimable amount when stake can be ended */}
                    {canEndStake && (
                      <p className="text-sm text-gray-400 text-center">
                        Claimable: {(Number(claimableHedron) / 1e9).toLocaleString(undefined, { maximumFractionDigits: 2 })} HDRN
                      </p>
                    )}
                  </div>
                )}

                {/* Always show End Stake button - ghosted if Hedron hasn't been minted yet */}
                <button
                  onClick={handleEndStake}
                  disabled={!canEndStake || claimableHedron > 0n || isMintingHedron || isEndingStake}
                  className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
                    canEndStake && claimableHedron === 0n && !isMintingHedron && !isEndingStake
                      ? 'bg-white text-black hover:bg-gray-200'
                      : 'bg-gray-700 text-gray-400 cursor-not-allowed opacity-50'
                  }`}
                >
                  {isEndingStake ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing...
                    </span>
                  ) : (
                    'End Stake'
                  )}
                </button>
              </div>
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

              {redeemAmount && parseFloat(removeCommas(redeemAmount)) > 0 && !stakeIsActive && !isLoading && stakeEndDay && (
                <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-xl">
                  <p className="text-sm text-gray-400">You will receive approximately:</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {calculateRedeemableHex(redeemAmount)} HEX
                  </p>
                </div>
              )}

              <button
                onClick={handleRedeem}
                disabled={!redeemAmount || parseFloat(removeCommas(redeemAmount)) <= 0 || isLoading || stakeIsActive || !stakeEndDay}
                className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
                  redeemAmount && parseFloat(removeCommas(redeemAmount)) > 0 && !isLoading && !stakeIsActive && stakeEndDay
                    ? 'bg-white text-black hover:bg-gray-200'
                    : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isLoading || !stakeEndDay ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {isLoading ? 'Processing...' : 'Loading...'}
                  </span>
                ) : (
                  `Redeem Your HEX`
                )}
              </button>

              {stakeIsActive && stakeEndDay && (
                <p className="text-sm text-yellow-400 text-center flex items-start justify-center gap-2 leading-5">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="leading-5">
                    Redemption is only available after the stake ends in:{' '}
                    <span className="font-mono">
                      {timeRemaining.days > 0 && `${timeRemaining.days}d `}
                      {String(timeRemaining.hours).padStart(2, '0')}h{' '}
                      {String(timeRemaining.minutes).padStart(2, '0')}m{' '}
                      {String(timeRemaining.seconds).padStart(2, '0')}s
                    </span>
                  </span>
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
      className={`px-3 md:px-6 py-2 md:py-3 rounded-t-xl font-semibold relative ${
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
  if (highlight) {
    return (
      <div className="flex justify-between items-center py-3 border-b border-gray-900">
        <span className="text-gray-400">{label}</span>
        <span className="font-semibold text-yellow-400 bg-yellow-900/20 px-3 py-2 rounded-lg">
          {value}
        </span>
      </div>
    );
  }
  
  return (
    <div className="flex justify-between items-center py-3 border-b border-gray-900">
      <span className="text-gray-400">{label}</span>
      <span className="font-semibold text-white">{value}</span>
    </div>
  );
}


