'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { usePerpetualPool } from '@/hooks/contracts/usePerpetualPool';
import { useDiamondHands } from '@/hooks/contracts/useDiamondHands';
import { usePool } from '@/context/PoolContext';
import { Loader2, CheckCircle2, AlertCircle, ExternalLink, Gem } from 'lucide-react';
import { formatEther, parseUnits } from 'viem';
import { ConnectButton } from './ConnectButton';
import { formatHexDayToUTCDate } from '@/utils/format';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface StakeInterfaceProps {
  activeTab: 'info' | 'end' | 'claim' | 'mint';
  setActiveTab: (tab: 'info' | 'end' | 'claim' | 'mint') => void;
  onTransactionStart?: () => void;
  onTransactionEnd?: () => void;
  onTransactionSuccess?: (message: string, txHash?: string) => void;
  onTransactionError?: (error: string) => void;
}

// Diamond Hands contract addresses for each pool
const DIAMOND_HANDS_CONTRACTS: Record<string, string> = {
  BASE: '0x992678ad242230Dd795107Fee8B572E27083002A',
  TRIO: '0x7F343C25a6FD8Ce5fac441Cff22be3758EbE1e04',
  LUCKY: '0x4497f24bc4096053C3a5687A051732731b3f631B',
  DECI: '0x196E5f240d26969CFEf464e80C6e423620cc7E40',
};

// Reward Bucket contract addresses for each pool (where penalties accumulate)
const REWARD_BUCKET_CONTRACTS: Record<string, string> = {
  BASE: '0x3778B2e2D6ADe902058FA4e82424F1A376a3d417',
  TRIO: '0xD71dE2f590C59D3BEc80b5C69898AAfaa2Ab53A9',
  LUCKY: '0xE6b296485c2b31d060A6f75D1e9fCC870997BbA3',
  DECI: '0xFc9664af5f73d0F347e51cd213B7378b6e7ecaeb',
};

// Stake Reward Distribution contract addresses for each pool (where users claim rewards)
const STAKE_REWARD_DISTRIBUTION_CONTRACTS: Record<string, string> = {
  BASE: '0x4C03598b0347C571C71b440F8eBD522553A2cB1B',
  TRIO: '0xa5DC9Ae34AB52d877a5727D106e36318AA59E50B',
  LUCKY: '0x9f17805c3713a2cF3e710Aa7dCe5A2CFB74E9972',
  DECI: '0x9844B2bD1e05F04A173edf6ee4Cc83d52350b664',
};

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
    stakeStartDay,
    currentHexDay,
    hexRedemptionRate,
    userBalance,
    tokenSymbol,
    tokenName,
    endStake,
    redeemHex,
    mintHedron,
    approveHex,
    pledgeHex,
    stakeHex,
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
    stakeInfo,
    hasHedronMinted,
  } = usePerpetualPool(selectedPool.contractAddress as `0x${string}`, selectedTicker);

  const [redeemAmount, setRedeemAmount] = useState('');
  const [mintAmount, setMintAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [lockAmount, setLockAmount] = useState('');
  const [timeRemaining, setTimeRemaining] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [reloadPhaseTimeRemaining, setReloadPhaseTimeRemaining] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const redeemAmountRef = useRef<HTMLInputElement>(null);
  const mintAmountRef = useRef<HTMLInputElement>(null);
  const withdrawAmountRef = useRef<HTMLInputElement>(null);
  const lockAmountRef = useRef<HTMLInputElement>(null);

  // Period-specific staking amounts for accurate reward calculations
  const [userStakedForActivePeriod, setUserStakedForActivePeriod] = useState<bigint>(0n);
  const [globalStakedForActivePeriod, setGlobalStakedForActivePeriod] = useState<bigint>(0n);
  const [userStakedForNextPeriod, setUserStakedForNextPeriod] = useState<bigint>(0n);
  const [globalStakedForNextPeriod, setGlobalStakedForNextPeriod] = useState<bigint>(0n);
  const [allPeriodCommitments, setAllPeriodCommitments] = useState<{period: number, amount: string}[]>([]);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  // Diamond Hands hook - only if pool has a DH contract
  const dhContractAddress = DIAMOND_HANDS_CONTRACTS[selectedTicker] as `0x${string}` | undefined;
  const {
    userStakedAmount,
    globalStakedAmount,
    poolTokenTotalSupply,
    currentPeriod,
    rewardBucketAddress,
    rewardBucketBalance,
    stakeRewardDistributionAddress,
    dhAllowance,
    isLoading: isDHLoading,
    getActiveStakingPeriod,
    getUserStakedForPeriod,
    getGlobalStakedForPeriod,
    getAllUserStakes,
    calculatePenalty,
    withdrawCompleted,
    withdrawEarly,
    approvePoolToken,
    lockTokens,
  } = useDiamondHands(
    dhContractAddress || '0x0000000000000000000000000000000000000000' as `0x${string}`,
    selectedPool.contractAddress as `0x${string}`
  );

  // Threshold for showing detailed countdown (days)
  // Change this number to adjust when the HH:MM:SS countdown appears
  const COUNTDOWN_THRESHOLD_DAYS = 30;

  // Check if we should show "Start the Stake" instead of "End the Stake"
  const shouldShowStartStake = !stakeIsActive && currentHexDay && reloadPhaseEnd && currentHexDay > reloadPhaseEnd;

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

  // Fetch period-specific staking amounts for accurate reward calculations
  useEffect(() => {
    const fetchPeriodAmounts = async () => {
      if (!currentPeriod || !getActiveStakingPeriod || !getUserStakedForPeriod || !getGlobalStakedForPeriod || !getAllUserStakes) {
        return;
      }

      const logs: string[] = [];

      try {
        const activePeriod = await getActiveStakingPeriod();
        if (activePeriod === null) return;

        logs.push(`🔍 Starting period check for ${selectedPool.ticker}`);
        logs.push(`📅 Current Period: ${currentPeriod.toString()}`);
        logs.push(`🔄 Active Staking Period: ${activePeriod.toString()}`);
        logs.push('');

        // Calculate next staking period (active + 2 for odd periods, active + 1 for even periods)
        const nextStakingPeriod = (activePeriod as bigint) % 2n === 1n 
          ? (activePeriod as bigint) + 2n  // If odd (staking), next staking is +2
          : (activePeriod as bigint) + 1n; // If even (reload), next staking is +1

        logs.push(`⏭️  Next Staking Period: ${nextStakingPeriod.toString()}`);
        logs.push('');

        const [userAmountActive, globalAmountActive, userAmountNext, globalAmountNext] = await Promise.all([
          getUserStakedForPeriod(activePeriod),
          getGlobalStakedForPeriod(activePeriod),
          getUserStakedForPeriod(nextStakingPeriod),
          getGlobalStakedForPeriod(nextStakingPeriod)
        ]);

        setUserStakedForActivePeriod(userAmountActive);
        setGlobalStakedForActivePeriod(globalAmountActive);
        setUserStakedForNextPeriod(userAmountNext);
        setGlobalStakedForNextPeriod(globalAmountNext);

        // DEBUG: Fetch all periods to see where tokens are committed
        const debugPeriods = [];
        const maxPeriod = Number(currentPeriod) + 5;
        logs.push(`🔎 Checking all periods (0 to ${maxPeriod}):`);
        logs.push('');
        
        for (let p = 0; p <= maxPeriod; p++) {
          const amount = await getUserStakedForPeriod(BigInt(p));
          if (amount > 0n) {
            const formatted = (Number(amount) / 1e8).toFixed(2);
            debugPeriods.push({
              period: p,
              amount: formatted
            });
            logs.push(`✅ Period ${p}: ${formatted} ${selectedPool.ticker}`);
          } else {
            logs.push(`❌ Period ${p}: No commitment`);
          }
        }
        
        logs.push('');
        
        // Fetch ALL stake records to see expired stakes
        logs.push('📋 ALL STAKE RECORDS (including expired):');
        logs.push('');
        const allStakes = await getAllUserStakes();
        
        if (allStakes.length > 0) {
          for (const stake of allStakes) {
            const balance = (Number(stake.balance) / 1e8).toFixed(2);
            const isExpired = stake.expiry < currentPeriod;
            const status = isExpired ? '⏰ EXPIRED' : '✅ ACTIVE';
            logs.push(`${status} StakeID ${stake.stakeID.toString()}: ${balance} ${selectedPool.ticker} (expires: period ${stake.expiry.toString()})`);
          }
        } else {
          logs.push('No stakes found');
        }
        
        logs.push('');
        if (debugPeriods.length === 0) {
          const dhBalance = userStakedAmount ? (Number(userStakedAmount) / 1e8).toFixed(2) : '0.00';
          logs.push(`⚠️ NO ACTIVE COMMITMENTS in any period!`);
          logs.push(`💎 But total DH balance shows: ${dhBalance} ${selectedPool.ticker}`);
          logs.push('');
          if (allStakes.length > 0) {
            logs.push('✅ Found expired stakes above - you can withdraw them penalty-free!');
          }
        } else {
          logs.push(`✅ Found ${debugPeriods.length} active period commitment(s)`);
        }
        
        setAllPeriodCommitments(debugPeriods);
        setDebugLogs(logs);
      } catch (error) {
        logs.push(`❌ ERROR: ${error}`);
        setDebugLogs(logs);
        console.error('Error fetching period amounts:', error);
      }
    };

    fetchPeriodAmounts();
  }, [currentPeriod, getActiveStakingPeriod, getUserStakedForPeriod, getGlobalStakedForPeriod, getAllUserStakes, selectedPool.ticker, userStakedAmount]);

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

  // Real-time countdown - always active when stake is active
  useEffect(() => {
    if (!stakeEndDay || !stakeIsActive) {
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
  }, [stakeEndDay, stakeIsActive]);

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
      onTransactionError?.(
        error?.message || 'Failed to end stake. Please try again.'
      );
    } finally {
      onTransactionEnd?.();
    }
  };

  const handleStartStake = async () => {
    try {
      onTransactionStart?.();
      
      const result = await stakeHex();
      
      onTransactionSuccess?.(
        'Stake started successfully! All HEX in the pool has been staked.',
        result.hash
      );
    } catch (error: any) {
      onTransactionError?.(
        error?.message || 'Failed to start stake. Please try again.'
      );
    } finally {
      onTransactionEnd?.();
    }
  };

  const handleMintHedron = async () => {
    if (!stakeInfo) {
      onTransactionError?.('Stake information not available. Please refresh and try again.');
      return;
    }

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
      onTransactionError?.(
        error?.message || 'Failed to pledge HEX. Please try again.'
      );
    } finally {
      onTransactionEnd?.();
    }
  };

  const handleDHWithdraw = async () => {
    const cleanAmount = removeCommas(withdrawAmount);
    if (!cleanAmount || parseFloat(cleanAmount) <= 0) {
      onTransactionError?.('Please enter a valid amount to withdraw');
      return;
    }

    try {
      onTransactionStart?.();
      
      // Convert to mini (8 decimals)
      const [whole, decimal = ''] = cleanAmount.split('.');
      const paddedDecimal = decimal.padEnd(8, '0').slice(0, 8);
      const amountInMini = BigInt(whole + paddedDecimal);
      
      // Get the current period to determine stakeID
      // For most cases, users will withdraw from currentPeriod or currentPeriod-1
      const stakeID = currentPeriod || 1n;
      
      // Try completed withdrawal first (no penalty)
      try {
        const penalty = await calculatePenalty(amountInMini);
        
        // If penalty would be charged, show a confirmation
        if (penalty > 0n) {
          const penaltyAmount = (Number(penalty) / 1e8).toFixed(2);
          const willReceive = (Number(amountInMini - penalty) / 1e8).toFixed(2);
          
          if (!confirm(`Early withdrawal incurs a penalty of ${penaltyAmount} ${selectedPool.ticker}. You will receive ${willReceive} ${selectedPool.ticker}. Continue?`)) {
            onTransactionEnd?.();
            return;
          }
          
          const result = await withdrawEarly(stakeID, amountInMini);
          onTransactionSuccess?.(
            `Successfully withdrew ${formatNumberWithCommas(cleanAmount)} ${selectedPool.ticker} (with penalty)`,
            result.hash
          );
        } else {
          const result = await withdrawCompleted(stakeID, amountInMini);
          onTransactionSuccess?.(
            `Successfully withdrew ${formatNumberWithCommas(cleanAmount)} ${selectedPool.ticker}`,
            result.hash
          );
        }
        
        setWithdrawAmount('');
      } catch (error: any) {
        throw error;
      }
    } catch (error: any) {
      onTransactionError?.(
        error?.message || 'Failed to withdraw from Diamond Hands. Please try again.'
      );
    } finally {
      onTransactionEnd?.();
    }
  };

  // Format Diamond Hands balance
  const formattedDHBalance = userStakedAmount 
    ? (Number(userStakedAmount) / 1e8).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '0.00';
  
  // Get full precision DH balance for MAX button
  const getFullPrecisionDHBalance = () => {
    if (!userStakedAmount) return '0';
    const balanceStr = userStakedAmount.toString().padStart(9, '0');
    const whole = balanceStr.slice(0, -8) || '0';
    const decimal = balanceStr.slice(-8).replace(/0+$/, '');
    return decimal ? `${whole}.${decimal}` : whole;
  };

  // Format global staked amount in DH contract
  const formattedGlobalStaked = globalStakedAmount 
    ? (Number(globalStakedAmount) / 1e8).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '0.00';

  // Calculate user's percentage of total staked (using period-specific amounts for accuracy)
  const userPercentage = userStakedForActivePeriod && globalStakedForActivePeriod && Number(globalStakedForActivePeriod) > 0
    ? ((Number(userStakedForActivePeriod) / Number(globalStakedForActivePeriod)) * 100).toFixed(4)
    : '0.0000';

  // Calculate percentage of total supply locked in DH (using global amount)
  const supplyLockedPercentage = globalStakedAmount && poolTokenTotalSupply && Number(poolTokenTotalSupply) > 0
    ? ((Number(globalStakedAmount) / Number(poolTokenTotalSupply)) * 100).toFixed(2)
    : '0.00';

  // Format reward bucket balance
  const formattedRewardBucket = rewardBucketBalance 
    ? (Number(rewardBucketBalance) / 1e8).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '0.00';

  // Calculate pending rewards for user (using period-specific amounts)
  const pendingRewards = userStakedForActivePeriod && globalStakedForActivePeriod && rewardBucketBalance && Number(globalStakedForActivePeriod) > 0
    ? ((Number(userStakedForActivePeriod) / Number(globalStakedForActivePeriod)) * (Number(rewardBucketBalance) / 1e8)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '0.00';

  // Format next period staking amounts
  const formattedUserNextPeriod = userStakedForNextPeriod
    ? (Number(userStakedForNextPeriod) / 1e8).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '0.00';

  const formattedGlobalNextPeriod = globalStakedForNextPeriod
    ? (Number(globalStakedForNextPeriod) / 1e8).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '0.00';

  // Format current active period staking amounts
  const formattedGlobalActivePeriod = globalStakedForActivePeriod
    ? (Number(globalStakedForActivePeriod) / 1e8).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '0.00';

  const formattedUserActivePeriod = userStakedForActivePeriod
    ? (Number(userStakedForActivePeriod) / 1e8).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '0.00';

  // Calculate APY for pending rewards (using period-specific amounts)
  const calculateRewardsAPY = () => {
    if (!userStakedForActivePeriod || !globalStakedForActivePeriod || !rewardBucketBalance || !stakeStartDay || !currentHexDay) {
      return '0.00';
    }

    const userStakedNumber = Number(userStakedForActivePeriod) / 1e8;
    const pendingRewardsNumber = (Number(userStakedForActivePeriod) / Number(globalStakedForActivePeriod)) * (Number(rewardBucketBalance) / 1e8);
    
    if (userStakedNumber === 0 || pendingRewardsNumber === 0) {
      return '0.00';
    }

    // Calculate days elapsed since stake started
    const daysElapsed = Math.max(1, Number(currentHexDay) - Number(stakeStartDay));
    
    // Calculate ROI and annualize it
    const roi = pendingRewardsNumber / userStakedNumber;
    const annualizedAPY = (roi * (365 / daysElapsed)) * 100;
    
    return annualizedAPY.toFixed(2);
  };

  const rewardsAPY = calculateRewardsAPY();

  const handleDHLock = async () => {
    const cleanAmount = removeCommas(lockAmount);
    if (!cleanAmount || parseFloat(cleanAmount) <= 0) {
      onTransactionError?.('Please enter a valid amount to lock');
      return;
    }

    try {
      onTransactionStart?.();
      
      // Convert to mini (8 decimals)
      const [whole, decimal = ''] = cleanAmount.split('.');
      const paddedDecimal = decimal.padEnd(8, '0').slice(0, 8);
      const amountInMini = BigInt(whole + paddedDecimal);
      
      const result = await lockTokens(amountInMini);
      onTransactionSuccess?.(
        `Successfully locked ${formatNumberWithCommas(cleanAmount)} ${selectedPool.ticker} in Diamond Hands!`,
        result.hash
      );
      
      setLockAmount('');
      await refetchBalance();
    } catch (error: any) {
      onTransactionError?.(
        error?.message || 'Failed to lock tokens. Please try again.'
      );
    } finally {
      onTransactionEnd?.();
    }
  };

  const handleDHApprove = async () => {
    const cleanAmount = removeCommas(lockAmount);
    if (!cleanAmount || parseFloat(cleanAmount) <= 0) {
      onTransactionError?.('Please enter a valid amount to approve');
      return;
    }

    try {
      onTransactionStart?.();
      
      // Convert to mini (8 decimals)
      const [whole, decimal = ''] = cleanAmount.split('.');
      const paddedDecimal = decimal.padEnd(8, '0').slice(0, 8);
      const amountInMini = BigInt(whole + paddedDecimal);
      
      const result = await approvePoolToken(amountInMini);
      onTransactionSuccess?.(
        `Successfully approved ${formatNumberWithCommas(cleanAmount)} ${selectedPool.ticker} for Diamond Hands!`,
        result.hash
      );
    } catch (error: any) {
      onTransactionError?.(
        error?.message || 'Failed to approve tokens. Please try again.'
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
          label={shouldShowStartStake ? "Start The Stake" : "End The Stake"}
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
                  {stakeEndDay ? formatHexDayToUTCDate(stakeEndDay) : 'Loading...'}
                </span>
                {stakeEndDay && (
                  <span className="text-gray-500 text-xs mt-1">HEX Day {stakeEndDay.toString()}</span>
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
                <div className="flex items-start gap-2 text-yellow-400 mb-4">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
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
              <div className="space-y-4">
                <button
                  onClick={handleMintHedron}
                  disabled={!canEndStake || hasHedronMinted || isLoading}
                  className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
                    canEndStake && !hasHedronMinted && !isLoading
                      ? 'bg-purple-500 text-white hover:bg-purple-400'
                      : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing...
                    </span>
                  ) : (
                    'Mint Hedron'
                  )}
                </button>

                <button
                  onClick={handleEndStake}
                  disabled={!canEndStake || !hasHedronMinted || isLoading}
                  className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
                    canEndStake && hasHedronMinted && !isLoading
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
              </div>
            )}

            {shouldShowStartStake && (
              <button
                onClick={handleStartStake}
                disabled={isLoading}
                className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
                  !isLoading
                    ? 'bg-green-500 text-white hover:bg-green-400'
                    : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </span>
                ) : (
                  'Start Stake'
                )}
              </button>
            )}
          </div>

          <div className={`space-y-6 transition-all duration-200 ${activeTab === 'claim' ? 'opacity-100 visible' : 'opacity-0 invisible absolute inset-0'}`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-white">Burn {selectedPool.ticker}. Claim HEX.</h2>
              
              {/* Diamond Hands Button - Only show if pool has a DH contract */}
              {DIAMOND_HANDS_CONTRACTS[selectedTicker] && (
                <Dialog>
                  <DialogTrigger asChild>
                    <button className="flex items-center justify-center p-2 text-white/70 rounded-lg hover:text-white">
                      <Gem className="w-5 h-5" />
                    </button>
                  </DialogTrigger>
                  <DialogContent className="bg-black border-2 border-purple-500/50 max-h-[90vh] overflow-y-auto [&>button]:focus:ring-0 [&>button]:focus:ring-offset-0 [&>button]:focus:outline-none [&>button]:focus-visible:ring-0 rounded-xl">
                    <DialogHeader>
                      <DialogTitle className="text-2xl font-bold text-white flex items-center gap-2">
                        <Gem className="w-6 h-6 text-purple-400" />
                        Unlock {selectedPool.ticker} from Diamond Hands
                      </DialogTitle>

                    </DialogHeader>
                    <div className="space-y-4 mt-2">
                      {/* User's Staked Balance */}
                      <div className="p-4 bg-gradient-to-r from-purple-900/30 to-purple-800/30 border border-purple-500/50 rounded-xl">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-300 text-sm">Your Locked Balance:</span>
                          <span className="text-2xl font-bold text-white">
                            {formattedDHBalance} {selectedPool.ticker}
                          </span>
                        </div>
                      </div>

                      {/* User's Personal Commitments */}
                      {userStakedAmount && Number(userStakedAmount) > 0 && (
                        <div className="p-4 bg-purple-900/20 border border-purple-700/50 rounded-xl">
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-sm font-semibold text-purple-300">💎 Your Commitments</div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="text-xs text-purple-400 mb-1">Your Locked (Current)</div>
                              <div className="text-base font-semibold text-white">{formattedUserActivePeriod} {selectedPool.ticker}</div>
                              <div className="text-xs text-purple-300 mt-1">Earning rewards now</div>
                            </div>
                            <div>
                              <div className="text-xs text-purple-400 mb-1">Your Locked (Next)</div>
                              <div className="text-base font-semibold text-white">{formattedUserNextPeriod} {selectedPool.ticker}</div>
                              <div className="text-xs text-purple-300 mt-1">Will earn next period</div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* DEBUG: All Period Commitments */}
                      {userStakedAmount && Number(userStakedAmount) > 0 && (
                        <div className="p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-xl">
                          <div className="text-sm font-semibold text-yellow-300 mb-2">
                            🔍 DEBUG: Period Scan Results
                          </div>
                          {debugLogs.length > 0 ? (
                            <div className="space-y-0.5 max-h-60 overflow-y-auto font-mono">
                              {debugLogs.map((log, idx) => (
                                <div key={idx} className="text-xs text-yellow-100 whitespace-pre">
                                  {log}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-xs text-yellow-200">
                              Loading period data...
                            </div>
                          )}
                        </div>
                      )}

                      {/* Diamond Hands Stats Grid */}
                      <div className="grid grid-cols-2 gap-3">
                        {/* Total Locked in DH */}
                        <div className="p-3 bg-gray-900/50 border border-gray-700/50 rounded-lg">
                          <div className="text-xs text-gray-400 mb-1">Total in DH Contract</div>
                          <div className="text-lg font-semibold text-white">{formattedGlobalStaked}</div>
                          <div className="text-xs text-gray-500">{selectedPool.ticker}</div>
                          <div className="text-xs text-purple-400 mt-1">{supplyLockedPercentage}% of total supply</div>
                        </div>

                        {/* User's Share % - Current Period */}
                        <div className="p-3 bg-gray-900/50 border border-gray-700/50 rounded-lg">
                          <div className="text-xs text-gray-400 mb-1">Your Share (Current)</div>
                          <div className="text-lg font-semibold text-purple-400">{userPercentage}%</div>
                          <div className="text-xs text-gray-500">of active period</div>
                        </div>

                        {/* Reward Bucket Balance */}
                        <div className="p-3 bg-amber-900/20 border border-amber-700/50 rounded-lg">
                          <div className="text-xs text-amber-400 mb-1">Reward Bucket</div>
                          <div className="text-lg font-semibold text-white">{formattedRewardBucket}</div>
                          <div className="text-xs text-amber-500/70">{selectedPool.ticker} penalties</div>
                        </div>

                        {/* User's Pending Rewards */}
                        <div className="p-3 bg-green-900/20 border border-green-700/50 rounded-lg">
                          <div className="text-xs text-green-400 mb-1">Your Pending Rewards</div>
                          <div className="flex items-baseline gap-2">
                            <div className="text-lg font-semibold text-green-300">{pendingRewards}</div>
                            <div className="text-xs text-green-400">({rewardsAPY}% APY)</div>
                          </div>
                          <div className="text-xs text-green-500/70">{selectedPool.ticker}</div>
                        </div>
                      </div>

                      {/* Period Comparison - Current vs Next */}
                      {(Number(globalStakedForActivePeriod) > 0 || Number(globalStakedForNextPeriod) > 0) && (
                        <div className="p-4 bg-blue-900/20 border border-blue-700/50 rounded-xl">
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-sm font-semibold text-blue-300">🔒 Period Comparison</div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="text-xs text-blue-400 mb-1">Total Locked (Current)</div>
                              <div className="text-base font-semibold text-white">{formattedGlobalActivePeriod} {selectedPool.ticker}</div>
                              <div className="text-xs text-blue-300 mt-1">Currently earning rewards</div>
                            </div>
                            <div>
                              <div className="text-xs text-blue-400 mb-1">Total Locked (Next)</div>
                              <div className="text-base font-semibold text-white">{formattedGlobalNextPeriod} {selectedPool.ticker}</div>
                              <div className="text-xs text-blue-300 mt-1">Pre-committed for next period</div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Withdrawal Section */}
                      {stakeIsActive ? (
                        <div className="p-4 bg-gray-900/50 border border-gray-700/50 rounded-xl text-center">
                          <p className="text-gray-400 mb-2">🔒 Unlocking Disabled</p>
                          <p className="text-gray-500 text-sm">You cannot unlock tokens while the stake is active. Please wait until the stake ends.</p>
                        </div>
                      ) : userStakedAmount && Number(userStakedAmount) > 0 ? (
                        <div className="space-y-3">
                          <h3 className="text-lg font-semibold text-white">Unlock Amount</h3>
                          <div>
                            <input
                              ref={withdrawAmountRef}
                              type="text"
                              value={formatNumberWithCommas(withdrawAmount)}
                              onChange={(e) => handleAmountChange(e, setWithdrawAmount, withdrawAmountRef)}
                              placeholder="0.00"
                              className="w-full bg-black border border-purple-500/50 rounded-lg p-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
                            />
                            
                            {/* Balance and MAX button */}
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-gray-400 text-xs">
                                Available: {formattedDHBalance} {selectedPool.ticker}
                              </span>
                              <button
                                type="button"
                                onClick={() => setWithdrawAmount(getFullPrecisionDHBalance())}
                                className="text-purple-400 hover:text-purple-300 text-xs font-medium transition-colors"
                              >
                                MAX
                              </button>
                            </div>
                          </div>

                          <button
                            onClick={handleDHWithdraw}
                            disabled={!withdrawAmount || parseFloat(removeCommas(withdrawAmount)) <= 0 || isDHLoading}
                            className={`w-full py-3 rounded-xl font-semibold text-lg transition-all ${
                              withdrawAmount && parseFloat(removeCommas(withdrawAmount)) > 0 && !isDHLoading
                                ? 'bg-purple-500 text-white hover:bg-purple-400'
                                : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            {isDHLoading ? (
                              <span className="flex items-center justify-center gap-2">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Processing...
                              </span>
                            ) : (
                              'Unlock Tokens'
                            )}
                          </button>

                          <div className="p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-xl">
                            <p className="text-xs text-yellow-300">
                              <strong>Note:</strong> Early withdrawal incurs a penalty. Withdraw after the stake ends for full amount.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 bg-gray-900/50 border border-gray-700 rounded-xl text-center">
                          <p className="text-gray-400">You have no tokens locked in Diamond Hands.</p>
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>

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
                <p className="text-sm text-yellow-400 text-center flex items-start justify-center gap-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>
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

          <div className={`space-y-6 transition-all duration-200 ${activeTab === 'mint' ? 'opacity-100 visible' : 'opacity-0 invisible absolute inset-0'}`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-white">Pledge HEX. Mint {selectedPool.ticker}.</h2>
              
              {/* Diamond Hands Button - Only show if pool has a DH contract */}
              {DIAMOND_HANDS_CONTRACTS[selectedTicker] && (
                <Dialog>
                  <DialogTrigger asChild>
                    <button className="flex items-center justify-center p-2 text-white/70 hover:text-white">
                      <Gem className="w-5 h-5" />
                    </button>
                  </DialogTrigger>
                  <DialogContent className="bg-black border-2 border-purple-500/50 rounded-xl max-h-[90vh] overflow-y-auto [&>button]:focus:ring-0 [&>button]:focus:ring-offset-0 [&>button]:focus:outline-none [&>button]:focus-visible:ring-0">
                    <DialogHeader>
                      <DialogTitle className="text-2xl font-bold text-white flex items-center gap-2">
                        <Gem className="w-6 h-6 text-purple-400" />
                        Lock {selectedPool.ticker} in Diamond Hands
                      </DialogTitle>

                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      {/* Lock Section */}
                      {stakeIsActive ? (
                        <div className="space-y-3">
                          <div className="p-4 bg-gray-900/50 border border-gray-700/50 rounded-xl text-center">
                            <p className="text-gray-400 mb-2">🔒 Locking Disabled</p>
                            <p className="text-gray-500 text-sm">You cannot lock tokens while the stake is active. Locking is only available during the reload phase (after stake ends).</p>
                          </div>
                        </div>
                      ) : !isMintingPhaseActive ? (
                        <div className="space-y-3">
                          <h3 className="text-lg font-semibold text-white">Lock Tokens for Next Period</h3>
                          <div className="p-4 bg-gray-900/50 border border-gray-700/50 rounded-xl text-center">
                            <p className="text-gray-400 mb-2">⏰ Reload Phase Ended</p>
                            <p className="text-gray-500 text-sm">The reload phase has ended. You can no longer lock tokens for this period.</p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <h3 className="text-lg font-semibold text-white">Lock Tokens for Next Period</h3>
                          <div>
                            <input
                              ref={lockAmountRef}
                              type="text"
                              value={formatNumberWithCommas(lockAmount)}
                              onChange={(e) => handleAmountChange(e, setLockAmount, lockAmountRef)}
                              placeholder="0.00"
                              className="w-full bg-black border border-purple-500/50 rounded-lg p-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
                            />
                            
                            {/* Balance and MAX button */}
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-gray-400 text-xs">
                                Balance: {formattedBalance} {selectedPool.ticker}
                              </span>
                              <button
                                type="button"
                                onClick={() => setLockAmount(getFullPrecisionBalance())}
                                className="text-purple-400 hover:text-purple-300 text-xs font-medium transition-colors"
                              >
                                MAX
                              </button>
                          </div>
                        </div>

                          {/* Check if approval is needed */}
                          {lockAmount && parseFloat(removeCommas(lockAmount)) > 0 && (() => {
                            const cleanAmount = removeCommas(lockAmount);
                            const [whole, decimal = ''] = cleanAmount.split('.');
                            const paddedDecimal = decimal.padEnd(8, '0').slice(0, 8);
                            const amountInMini = BigInt(whole + paddedDecimal);
                            const needsApproval = !dhAllowance || dhAllowance < amountInMini;

                            return needsApproval ? (
                              <button
                                onClick={handleDHApprove}
                                disabled={isDHLoading}
                                className={`w-full py-3 rounded-xl font-semibold text-lg transition-all ${
                                  !isDHLoading
                                    ? 'bg-yellow-500 text-black hover:bg-yellow-400'
                                    : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                }`}
                              >
                                {isDHLoading ? (
                                  <span className="flex items-center justify-center gap-2">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Processing...
                                  </span>
                                ) : (
                                  `Approve ${selectedPool.ticker}`
                                )}
                              </button>
                            ) : (
                              <button
                                onClick={handleDHLock}
                                disabled={isDHLoading}
                                className={`w-full py-3 rounded-xl font-semibold text-lg transition-all ${
                                  !isDHLoading
                                    ? 'bg-purple-500 text-white hover:bg-purple-400'
                                    : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                }`}
                              >
                                {isDHLoading ? (
                                  <span className="flex items-center justify-center gap-2">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Processing...
                                  </span>
                                ) : (
                                  `Lock ${selectedPool.ticker}`
                                )}
                              </button>
                            );
                          })()}
                      </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>

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
                <div className="text-sm text-yellow-400 text-center space-y-2">
                  <div className="flex items-start justify-center gap-2">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <span>
                      Minting is only available during the reload phase. A period of {reloadPhaseDuration ? Number(reloadPhaseDuration) : '...'} days between the stake being ended and starting once again.
                    </span>
                  </div>
                  <div>
                    It starts in:{' '}
                    <span className="font-mono">
                      {timeRemaining.days > 0 && `${timeRemaining.days}d `}
                      {String(timeRemaining.hours).padStart(2, '0')}h{' '}
                      {String(timeRemaining.minutes).padStart(2, '0')}m{' '}
                      {String(timeRemaining.seconds).padStart(2, '0')}s
                    </span>
                  </div>
                </div>
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


