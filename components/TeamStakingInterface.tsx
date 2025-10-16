'use client';

import { useState, useRef, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { formatUnits, parseUnits, Address } from 'viem';
import { Loader2, Info, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTeamStaking } from '@/hooks/contracts/useTeamStaking';
import { usePerpetualPool } from '@/hooks/contracts/usePerpetualPool';
import { REWARD_TOKENS, RewardToken, REWARD_TOKEN_ADDRESSES } from '@/constants/team';
import { PERPETUAL_POOLS, getLatestPoolByPrefix } from '@/constants/crypto';
import { useTokenPrices } from '@/hooks/crypto/useTokenPrices';
import { useToast } from '@/hooks/use-toast';
import { 
  validateAmount, 
  removeCommas, 
  formatNumberWithCommas,
  isValidNumberInput 
} from '@/utils/validation';

export default function TeamStakingInterface() {
  const { address, isConnected, chain } = useAccount();
  const { toast } = useToast();
  const [isCheckingConnection, setIsCheckingConnection] = useState(true);
  
  // Fetch token prices for all reward tokens
  const rewardTokenAddresses = Object.values(REWARD_TOKEN_ADDRESSES);
  const { prices: tokenPrices } = useTokenPrices(rewardTokenAddresses);

  // Check connection status and wait for initial data load
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsCheckingConnection(false);
    }, 100);
    
    return () => clearTimeout(timer);
  }, [isConnected]);

  // Get the correct transaction URL based on chain
  const getTxUrl = (txHash: string) => {
    if (chain?.id === 1) {
      return `https://etherscan.io/tx/${txHash}`;
    }
    return `https://otter.pulsechain.com/tx/${txHash}`;
  };

  // Helper function to check if error is a user rejection
  const isUserRejection = (error: any): boolean => {
    const errorMessage = error?.message?.toLowerCase() || error?.toString()?.toLowerCase() || '';
    return (
      errorMessage.includes('user rejected') ||
      errorMessage.includes('user denied') ||
      errorMessage.includes('rejected the request') ||
      errorMessage.includes('user cancelled') ||
      errorMessage.includes('cancelled') ||
      errorMessage.includes('denied transaction') ||
      errorMessage.includes('user rejection')
    );
  };
  
  // Get the latest BASE pool dynamically based on chain (e.g., BASE3/BASE4 for PulseChain, eBASE3/eBASE4 for Ethereum)
  const BASE_POOL = getLatestPoolByPrefix('BASE', chain?.id) || (chain?.id === 1 ? PERPETUAL_POOLS.eBASE3 : PERPETUAL_POOLS.BASE3);
  const BASE_POOL_ADDRESS = BASE_POOL.contractAddress as Address;
  const {
    currentPeriod,
    isStakingPeriod,
    formattedTeamBalance,
    formattedUserStaked,
    formattedGlobalStaked,
    fullPrecisionTeamBalance,
    fullPrecisionUserStaked,
    isLoading,
    stakeTeam,
    earlyEndStake,
    endCompletedStake,
    extendStake,
    restakeExpiredStake,
    prepareClaim,
    claimRewards,
    checkPrepareClaimStatus,
    getClaimableAmount,
    checkHasClaimed,
    getUserStakedForPeriod,
    getAllUserStakes,
  } = useTeamStaking();

  // Use BASE pool hook to get stake status and countdown data
  const { 
    stakeIsActive: baseStakeIsActive,
    stakeStartDay,
    stakeEndDay,
    reloadPhaseEnd,
    currentHexDay,
  } = usePerpetualPool(BASE_POOL_ADDRESS, BASE_POOL.ticker as any);

  const [stakeAmount, setStakeAmount] = useState('');
  const [unstakeAmountsByPeriod, setUnstakeAmountsByPeriod] = useState<Record<number, string>>({});
  const [selectedClaimStakeID, setSelectedClaimStakeID] = useState('');
  const [showEarlyUnstakeDialog, setShowEarlyUnstakeDialog] = useState(false);
  const [earlyUnstakeDetails, setEarlyUnstakeDetails] = useState({
    amount: '',
    penalty: '',
    afterPenalty: '',
  });
  const [stakeEndCountdown, setStakeEndCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  
  // Period-specific state
  const [allPeriodCommitments, setAllPeriodCommitments] = useState<{period: number, stakeNumber: number, amount: string, formattedAmount: string, originalAmount: string, formattedOriginalAmount: string, status: 'active' | 'pending' | 'expired'}[]>([]);
  const [selectedStakePeriod, setSelectedStakePeriod] = useState<number | null>(null);
  const [isLoadingStakes, setIsLoadingStakes] = useState(false);
  const [selectedPeriodBalance, setSelectedPeriodBalance] = useState('0');
  const [selectedPeriodFullPrecision, setSelectedPeriodFullPrecision] = useState('0');
  const [stakesLoaded, setStakesLoaded] = useState(false);
  
  // Rewards data state - moved to main component for background loading
  const [periodRewardsData, setPeriodRewardsData] = useState<Record<number, {
    prepareStatuses: Record<string, boolean>;
    claimableAmounts: Record<string, bigint>;
    claimedStatuses: Record<string, boolean>;
    totalClaimable: number;
    hasAnyRewards: boolean;
  }>>({});
  const [isLoadingRewards, setIsLoadingRewards] = useState(false);
  const [selectedClaimPeriod, setSelectedClaimPeriod] = useState<number | null>(null);
  const [rewardsLoaded, setRewardsLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("stake");
  
  const stakeAmountRef = useRef<HTMLInputElement>(null);
  const unstakeAmountRef = useRef<HTMLInputElement>(null);

  // Default to current period for unstaking and claiming
  const currentStakeID = selectedStakePeriod !== null ? selectedStakePeriod.toString() : (currentPeriod ? currentPeriod.toString() : '');
  
  // Helper to get/set unstake amount for current selected period
  const unstakeAmount = selectedStakePeriod !== null ? (unstakeAmountsByPeriod[selectedStakePeriod] || '') : '';
  const setUnstakeAmount = (value: string) => {
    if (selectedStakePeriod !== null) {
      setUnstakeAmountsByPeriod(prev => ({
        ...prev,
        [selectedStakePeriod]: value,
      }));
    }
  };

  // Auto-fill stake ID for claims with current period
  useEffect(() => {
    if (currentPeriod && !selectedClaimStakeID) {
      setSelectedClaimStakeID(currentPeriod.toString());
    }
  }, [currentPeriod, selectedClaimStakeID]);

  // Fetch all user stakes across periods - only once on mount or when address/period changes
  useEffect(() => {
    const fetchAllStakesByPeriod = async () => {
      if (!address || !currentPeriod || !getAllUserStakes || stakesLoaded) return;

      setIsLoadingStakes(true);
      try {
        const allStakes = await getAllUserStakes();
        
        // Convert to array and format for display with status
        const current = Number(currentPeriod);
        const formatted = allStakes
          .filter(({ period }) => Number(period) % 2 === 1) // Only odd periods (staking periods)
          .map(({ stakeID, period, balance, originalBalance }) => {
            const periodNum = Number(period);
            
            // Determine status based on current period and staking period
            let status: 'active' | 'pending' | 'expired';
            if (periodNum < current) {
              status = 'expired';
            } else if (periodNum === current) {
              status = 'active';
            } else {
              status = 'pending';
            }
            
            const balanceFormatted = formatUnits(balance, 8);
            const numericBalance = parseFloat(balanceFormatted);
            
            const originalBalanceFormatted = formatUnits(originalBalance, 8);
            const numericOriginalBalance = parseFloat(originalBalanceFormatted);
            
            return {
              period: periodNum,
              stakeNumber: (periodNum + 1) / 2, // Calculate stake number from period: 1→1, 3→2, 5→3, etc.
              amount: balanceFormatted,
              formattedAmount: formatNumberMax2Decimals(numericBalance),
              originalAmount: originalBalanceFormatted,
              formattedOriginalAmount: formatNumberMax2Decimals(numericOriginalBalance),
              status,
            };
          })
          .sort((a, b) => a.stakeNumber - b.stakeNumber); // Sort by stake number ascending

        setAllPeriodCommitments(formatted);
        
        // Auto-select stake: priority is Active → Expired → Pending
        if (formatted.length > 0) {
          const activeStake = formatted.find(s => s.status === 'active');
          const expiredStake = formatted.find(s => s.status === 'expired');
          const pendingStake = formatted.find(s => s.status === 'pending');
          
          const defaultStake = activeStake || expiredStake || pendingStake || formatted[0];
          setSelectedStakePeriod(defaultStake.period);
        }
      } catch (error) {
        console.error('Error fetching stakes:', error);
        // Set empty array if error
        setAllPeriodCommitments([]);
      } finally {
        setIsLoadingStakes(false);
        setStakesLoaded(true); // Always set to true, even on error
      }
    };

    fetchAllStakesByPeriod();
  }, [address, currentPeriod, getAllUserStakes, stakesLoaded]);

  // Reset stakes loaded flag when address or chain changes
  useEffect(() => {
    setStakesLoaded(false);
    setAllPeriodCommitments([]);
    setSelectedStakePeriod(null);
    setUnstakeAmountsByPeriod({});
    setRewardsLoaded(false);
    setPeriodRewardsData({});
    setSelectedClaimPeriod(null);
  }, [address, chain?.id]);

  // Load rewards data in background after stakes are loaded
  useEffect(() => {
    const loadAllRewardsData = async () => {
      if (!allPeriodCommitments || allPeriodCommitments.length === 0 || rewardsLoaded) return;
      if (!checkPrepareClaimStatus || !getClaimableAmount || !checkHasClaimed) return;

      setIsLoadingRewards(true);
      const newPeriodData: Record<number, any> = {};

      for (const commitment of allPeriodCommitments) {
        const period = BigInt(commitment.period);
        const stakeID = BigInt(commitment.period);

        const prepareStatuses: Record<string, boolean> = {};
        const claimableAmounts: Record<string, bigint> = {};
        const claimedStatuses: Record<string, boolean> = {};
        let totalClaimable = 0;

        for (const token of REWARD_TOKENS) {
          try {
            const isPrepared = await checkPrepareClaimStatus(token, period);
            prepareStatuses[token] = Boolean(isPrepared);

            if (isPrepared) {
              const { amount } = await getClaimableAmount(period, token, stakeID);
              claimableAmounts[token] = amount;

              const hasClaimed = await checkHasClaimed(period, token, stakeID);
              claimedStatuses[token] = Boolean(hasClaimed);

              if (amount > 0n && !hasClaimed) {
                totalClaimable += parseFloat(formatUnits(amount, 8));
              }
            }
          } catch (error) {
            // Silent error handling
          }
        }

        newPeriodData[commitment.period] = {
          prepareStatuses,
          claimableAmounts,
          claimedStatuses,
          totalClaimable,
          hasAnyRewards: totalClaimable > 0 || Object.values(claimedStatuses).some(v => v),
        };
      }

      setPeriodRewardsData(newPeriodData);
      setIsLoadingRewards(false);
      setRewardsLoaded(true);

      // Auto-select first period with rewards, or most recent expired period
      if (!selectedClaimPeriod && allPeriodCommitments.length > 0) {
        const periodWithRewards = allPeriodCommitments.find((c: any) =>
          newPeriodData[c.period]?.hasAnyRewards
        );
        const expiredPeriod = allPeriodCommitments.find((c: any) => c.status === 'expired');
        const defaultPeriod = periodWithRewards || expiredPeriod || allPeriodCommitments[0];
        setSelectedClaimPeriod(defaultPeriod.period);
        setSelectedClaimStakeID(defaultPeriod.period.toString());
      }
    };

    loadAllRewardsData();
  }, [allPeriodCommitments, checkPrepareClaimStatus, getClaimableAmount, checkHasClaimed, rewardsLoaded, selectedClaimPeriod]);

  // Update selected period balance when selection changes
  useEffect(() => {
    if (selectedStakePeriod !== null) {
      const selectedCommitment = allPeriodCommitments.find(c => c.period === selectedStakePeriod);
      if (selectedCommitment) {
        setSelectedPeriodBalance(selectedCommitment.formattedAmount);
        setSelectedPeriodFullPrecision(selectedCommitment.amount);
      }
    }
  }, [selectedStakePeriod, allPeriodCommitments]);

  // Update selected claim stake ID when claim period changes
  useEffect(() => {
    if (selectedClaimPeriod !== null) {
      setSelectedClaimStakeID(selectedClaimPeriod.toString());
    }
  }, [selectedClaimPeriod]);

  // Countdown timer for when BASE stake ends
  useEffect(() => {
    if (!baseStakeIsActive) {
      return;
    }

    const updateCountdown = () => {
      // Use deadline from the latest BASE pool (dynamically selected based on chain)
      const deadline = new Date(BASE_POOL.deadlineUTC);
      const now = new Date();
      const secondsRemaining = Math.floor((deadline.getTime() - now.getTime()) / 1000);

      if (secondsRemaining <= 0) {
        setStakeEndCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const SECONDS_PER_DAY = 86400;
      const days = Math.floor(secondsRemaining / SECONDS_PER_DAY);
      const hours = Math.floor((secondsRemaining % SECONDS_PER_DAY) / 3600);
      const minutes = Math.floor((secondsRemaining % 3600) / 60);
      const seconds = secondsRemaining % 60;

      setStakeEndCountdown({ days, hours, minutes, seconds });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [baseStakeIsActive]);

  // Format number without trailing zeros
  const formatNumberClean = (value: number): string => {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 8,
    });
  };

  // Format number with max 2 decimal places
  const formatNumberMax2Decimals = (value: number): string => {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  const handleAmountChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (value: string) => void,
    ref: React.RefObject<HTMLInputElement>
  ) => {
    const rawValue = removeCommas(e.target.value);
    // Use validation utility for input checking
    if (rawValue === '' || isValidNumberInput(rawValue, 8)) {
      setter(rawValue);
      if (ref.current) {
        const cursorPosition = ref.current.selectionStart || 0;
        const oldLength = e.target.value.length;
        const newLength = formatNumberWithCommas(rawValue).length;
        const diff = newLength - oldLength;
        setTimeout(() => {
          ref.current?.setSelectionRange(cursorPosition + diff, cursorPosition + diff);
        }, 0);
      }
    }
  };

  const handleStake = async () => {
    // Validate amount
    const validation = validateAmount(stakeAmount, {
      fieldName: 'Stake amount',
      maxBalance: fullPrecisionTeamBalance || '0',
      maxDecimals: 8
    });
    
    if (!validation.isValid) {
      toast({
        title: "Error",
        description: validation.error || 'Please enter a valid amount',
        variant: "destructive",
      });
      return;
    }
    
    try {
      const amountBigInt = parseUnits(stakeAmount, 8);
      const { hash } = await stakeTeam(amountBigInt);
      setStakeAmount('');
      
      const txUrl = getTxUrl(hash);
      toast({
        title: "Success!",
        description: "Successfully staked TEAM! Click to view transaction.",
        variant: "success",
        action: (
          <Button
            variant="outline"
            size="sm"
            className="bg-white text-black hover:bg-gray-100 border-white"
            onClick={() => window.open(txUrl, '_blank')}
          >
            View TX
          </Button>
        ),
      });
      // Wait a bit for blockchain to update, then refetch stakes
      setTimeout(() => {
      setStakesLoaded(false);
      }, 2000);
    } catch (error: any) {
      if (!isUserRejection(error)) {
        toast({
          title: "Error",
          description: error.message || 'Failed to stake TEAM',
          variant: "destructive",
        });
      }
    }
  };

  const handleEarlyEndStake = () => {
    if (!currentStakeID || !unstakeAmount || parseFloat(unstakeAmount) <= 0) return;
    
    const penalty = parseFloat(unstakeAmount) * 0.0369;
    const afterPenalty = parseFloat(unstakeAmount) - penalty;
    
    setEarlyUnstakeDetails({
      amount: formatNumberWithCommas(unstakeAmount),
      penalty: formatNumberClean(penalty),
      afterPenalty: formatNumberClean(afterPenalty),
    });
    
    setShowEarlyUnstakeDialog(true);
  };

  const confirmEarlyEndStake = async () => {
    if (!currentStakeID || !unstakeAmount) return;
    
    setShowEarlyUnstakeDialog(false);
    
    try {
      const stakeIDBigInt = BigInt(currentStakeID);
      const amountBigInt = parseUnits(unstakeAmount, 8);
      const { hash } = await earlyEndStake(stakeIDBigInt, amountBigInt);
      setUnstakeAmount('');
      
      const txUrl = getTxUrl(hash);
      toast({
        title: "Success!",
        description: "Successfully unstaked TEAM (with penalty)! Click to view transaction.",
        variant: "success",
        action: (
          <Button
            variant="outline"
            size="sm"
            className="bg-white text-black hover:bg-gray-100 border-white"
            onClick={() => window.open(txUrl, '_blank')}
          >
            View TX
          </Button>
        ),
      });
      // Wait a bit for blockchain to update, then refetch stakes
      setTimeout(() => {
      setStakesLoaded(false);
      }, 2000);
    } catch (error: any) {
      if (!isUserRejection(error)) {
        toast({
          title: "Error",
          description: error.message || 'Failed to unstake TEAM',
          variant: "destructive",
        });
      }
    }
  };

  const handleEndCompleted = async () => {
    if (!currentStakeID || !unstakeAmount || parseFloat(unstakeAmount) <= 0) return;
    
    try {
      const stakeIDBigInt = BigInt(currentStakeID);
      const amountBigInt = parseUnits(unstakeAmount, 8);
      const { hash } = await endCompletedStake(stakeIDBigInt, amountBigInt);
      setUnstakeAmount('');
      
      const txUrl = getTxUrl(hash);
      toast({
        title: "Success!",
        description: "Successfully unstaked TEAM! Click to view transaction.",
        variant: "success",
        action: (
          <Button
            variant="outline"
            size="sm"
            className="bg-white text-black hover:bg-gray-100 border-white"
            onClick={() => window.open(txUrl, '_blank')}
          >
            View TX
          </Button>
        ),
      });
      // Wait a bit for blockchain to update, then refetch stakes
      setTimeout(() => {
      setStakesLoaded(false);
      }, 2000);
    } catch (error: any) {
      if (!isUserRejection(error)) {
        toast({
          title: "Error",
          description: error.message || 'Failed to unstake TEAM',
          variant: "destructive",
        });
      }
    }
  };


  const handleRestake = async () => {
    if (!currentStakeID) return;
    
    try {
      const stakeIDBigInt = BigInt(currentStakeID);
      const { hash } = await restakeExpiredStake(stakeIDBigInt);
      
      const txUrl = getTxUrl(hash);
      toast({
        title: "Success!",
        description: "Successfully restaked for next period! Click to view transaction.",
        variant: "success",
        action: (
          <Button
            variant="outline"
            size="sm"
            className="bg-white text-black hover:bg-gray-100 border-white"
            onClick={() => window.open(txUrl, '_blank')}
          >
            View TX
          </Button>
        ),
      });
      // Wait a bit for blockchain to update, then refetch stakes
      setTimeout(() => {
      setStakesLoaded(false);
      }, 2000);
    } catch (error: any) {
      if (!isUserRejection(error)) {
        toast({
          title: "Error",
          description: error.message || 'Failed to restake',
          variant: "destructive",
        });
      }
    }
  };

  const completedPeriod = currentPeriod ? Number(currentPeriod) - 1 : 0;
  const completedStakeNumber = completedPeriod > 0 ? Math.ceil(completedPeriod / 2) : 0;
  
  // Set default tab when stakes are loaded
  useEffect(() => {
    if (stakesLoaded && activeTab === "stake") {
      // Check if user has completed or expired stakes
      const hasCompletedStakes = allPeriodCommitments.some((c: any) => c.status === 'expired' || c.status === 'completed');
      if (hasCompletedStakes) {
        setActiveTab("rewards");
      }
    }
  }, [stakesLoaded, allPeriodCommitments]);

    return (
    <AnimatePresence mode="wait">
      {/* Loading State - wait for connection check OR (if connected, wait for stakes to load) */}
      {(isCheckingConnection || (isConnected && !stakesLoaded)) && (
        <div
          key="loading"
          className="w-full flex items-center justify-center py-16 md:py-32"
        >
          <Loader2 className="w-12 h-12 animate-spin text-white" />
        </div>
      )}

      {/* Connect Wallet Message */}
      {!isCheckingConnection && !isConnected && (
        <motion.div
          key="connect"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="w-full flex items-center justify-center py-16 md:py-32"
        >
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Connect Your Wallet</h1>
          <p className="text-gray-400">Please connect your wallet to access TEAM staking</p>
        </div>
        </motion.div>
      )}

      {/* Main Content */}
      {!isCheckingConnection && isConnected && stakesLoaded && (
        <motion.div 
          key="content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="w-full max-w-2xl mx-auto mt-4"
        >
      {/* Period Banner */}
      {!isStakingPeriod && currentPeriod && Number(currentPeriod) > 0 && (
        <div className="mb-6 p-4 bg-black border-1 border-white/50 rounded-xl">
          <p className="text-white font-semibold text-center">
            🎉 Stake {completedStakeNumber} has ended! Rewards are available to claim below
          </p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-black border-2 border-white/50 rounded-xl p-6">
          <h3 className="text-sm text-gray-300 mb-2">Liquid TEAM Balance</h3>
          {(() => {
            const teamTokenAddress = REWARD_TOKEN_ADDRESSES.TEAM;
            const teamPrice = tokenPrices?.[teamTokenAddress]?.price || 0;
            const teamAmount = parseFloat(fullPrecisionTeamBalance || '0');
            const usdValue = teamAmount * teamPrice;
            const formattedUSD = usdValue >= 1 
              ? `$${usdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : usdValue > 0 
              ? `$${usdValue.toFixed(4)}`
              : '$0.00';
            
            return (
              <>
                <p className="text-3xl font-bold text-white">{formattedUSD}</p>
                <p className="text-sm text-gray-400 mt-1">{formattedTeamBalance}</p>
              </>
            );
          })()}
        </div>
        
        <div className="bg-black border-2 border-white/50 rounded-xl p-6">
          <h3 className="text-sm text-gray-300 mb-2">Your Total Staked TEAM</h3>
          {(() => {
            const teamTokenAddress = REWARD_TOKEN_ADDRESSES.TEAM;
            const teamPrice = tokenPrices?.[teamTokenAddress]?.price || 0;
            const teamAmount = parseFloat(fullPrecisionUserStaked || '0');
            const usdValue = teamAmount * teamPrice;
            const formattedUSD = usdValue >= 1 
              ? `$${usdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : usdValue > 0 
              ? `$${usdValue.toFixed(4)}`
              : '$0.00';
            
            return (
              <>
                <p className="text-3xl font-bold text-white">{formattedUSD}</p>
                <p className="text-sm text-gray-400 mt-1">{formattedUserStaked}</p>
              </>
            );
          })()}
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex w-full justify-center bg-transparent rounded-none h-auto p-0 gap-0 mb-0">
          <TabsTrigger 
            value="stake" 
            className="text-[10px] sm:text-base md:text-lg px-3 md:px-8 py-2 md:py-3 rounded-t-xl rounded-b-none bg-transparent border-2 border-transparent data-[state=active]:bg-black data-[state=active]:border-white/50 data-[state=active]:border-b-transparent data-[state=active]:text-white text-gray-500 hover:text-gray-300 transition-colors relative data-[state=active]:z-10 font-semibold"
          >
            <span className="sm:hidden">Stake</span>
            <span className="hidden sm:inline">Stake TEAM</span>
          </TabsTrigger>
          <TabsTrigger 
            value="unstake" 
            className="text-[10px] sm:text-base md:text-lg px-3 md:px-8 py-2 md:py-3 rounded-t-xl rounded-b-none bg-transparent border-2 border-transparent data-[state=active]:bg-black data-[state=active]:border-white/50 data-[state=active]:border-b-transparent data-[state=active]:text-white text-gray-500 hover:text-gray-300 transition-colors relative data-[state=active]:z-10 font-semibold"
          >
            <span className="sm:hidden">Unstake</span>
            <span className="hidden sm:inline">Unstake TEAM</span>
          </TabsTrigger>
          <TabsTrigger 
            value="rewards" 
            className="text-[10px] sm:text-base md:text-lg px-3 md:px-8 py-2 md:py-3 rounded-t-xl rounded-b-none bg-transparent border-2 border-transparent data-[state=active]:bg-black data-[state=active]:border-white/50 data-[state=active]:border-b-transparent data-[state=active]:text-white text-gray-500 hover:text-gray-300 transition-colors relative data-[state=active]:z-10 font-semibold"
          >
            <span className="sm:hidden">Claim</span>
            <span className="hidden sm:inline">Claim Rewards</span>
          </TabsTrigger>
        </TabsList>

        {/* Stake Tab */}
        <TabsContent value="stake" className="mt-0">
          <div className="border-2 border-white/50 rounded-b-xl rounded-tr-xl rounded-tl-xl p-8 bg-black -mt-0.5">
            <h2 className="text-3xl font-bold text-white mb-6">Stake TEAM to Earn Rewards</h2>
            
            <div className="space-y-4">
              <div>
                <input
                  ref={stakeAmountRef}
                  type="text"
                  value={formatNumberWithCommas(stakeAmount)}
                  onChange={(e) => handleAmountChange(e, setStakeAmount, stakeAmountRef)}
                  placeholder="0.00"
                  className="w-full bg-black border-2 border-white/20 rounded-lg p-4 text-white text-lg placeholder-gray-400 focus:outline-none focus:border-white"
                />
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-gray-400 text-sm">
                    {formattedTeamBalance} TEAM
                  </span>
                  <button
                    type="button"
                    onClick={() => setStakeAmount(fullPrecisionTeamBalance)}
                    className="text-white hover:text-gray-300 text-sm font-semibold uppercase"
                  >
                    MAX
                  </button>
                </div>
              </div>

              <button
                onClick={handleStake}
                disabled={!stakeAmount || parseFloat(stakeAmount) <= 0 || isLoading}
                className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
                  stakeAmount && parseFloat(stakeAmount) > 0 && !isLoading
                    ? 'bg-white text-black hover:bg-gray-200'
                    : 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </span>
                ) : (
                  'Stake TEAM'
                )}
              </button>

              {/* Info banner based on BASE stake status - moved below button */}
              {baseStakeIsActive ? (
                <div className="p-4 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
                  <p className="text-sm text-yellow-400 leading-5">
                    ⚠️ <strong>Pre-commitment:</strong> Staking now commits your TEAM for the next BASE stake period (369 days).
                    <br />
                    <span className="text-xs mt-1 inline-block">
                      You can early unstake (EES) at any time with a 3.69% penalty.
                    </span>
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                  <p className="text-sm text-blue-400 leading-5">
                    ℹ️ <strong>Reload Phase:</strong> Staking now commits your TEAM for the next BASE stake period (369 days).
                    <br />
                    <span className="text-xs mt-1 inline-block">
                      You can early unstake (EES) at any time with a 3.69% penalty.
                    </span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Unstake Tab */}
        <TabsContent value="unstake" className="mt-0">
          <div className="border-2 border-white/50 rounded-b-xl rounded-tr-xl rounded-tl-xl p-8 bg-black -mt-0.5">
            <h2 className="text-3xl font-bold text-white mb-6">Unstake TEAM</h2>
            
            <div className="space-y-4">
              {/* Period Selector */}
              {isLoadingStakes ? (
                <div className="p-4 bg-white/5 border border-white/20 rounded-lg">
                  <p className="text-sm text-gray-400 text-center">
                    <Loader2 className="w-4 h-4 inline animate-spin mr-2 text-white" />
                    Loading your stakes...
                  </p>
                </div>
              ) : allPeriodCommitments.length > 0 ? (
                <div className="p-4 bg-white/5 border border-white/20 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-semibold text-white">Select Stake to Manage</div>
                    <div className="text-xs text-gray-400">{allPeriodCommitments.length} stake{allPeriodCommitments.length !== 1 ? 's' : ''}</div>
                  </div>
                  
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {allPeriodCommitments.map(({ period, stakeNumber, formattedAmount, formattedOriginalAmount, status }) => {
                      const isSelected = selectedStakePeriod === period;
                      return (
                        <label 
                          key={period} 
                          className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                            isSelected 
                              ? 'bg-white/10 border border-white/40' 
                              : 'bg-white/5 border border-transparent hover:bg-white/10'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="selectedStake"
                              checked={isSelected}
                              onChange={() => setSelectedStakePeriod(period)}
                              className="w-4 h-4 accent-green-400 cursor-pointer"
                            />
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-300 font-medium">Stake {stakeNumber}</span>
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                status === 'active' ? 'bg-green-500/20 text-green-300' :
                                status === 'pending' ? 'bg-blue-500/20 text-blue-300' :
                                'bg-gray-500/20 text-gray-400'
                              }`}>
                                {status === 'active' ? 'Active' : status === 'pending' ? 'Pre-committed' : 'Expired'}
                              </span>
                            </div>
                          </div>
                          <div className="text-sm font-semibold text-white">{formattedAmount} / {formattedOriginalAmount} TEAM</div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-white/5 border border-white/20 rounded-lg">
                  <p className="text-sm text-gray-400 text-center">
                    No TEAM stakes found. Stake TEAM to get started!
                  </p>
                </div>
              )}

              <div>
                <input
                  ref={unstakeAmountRef}
                  type="text"
                  value={formatNumberWithCommas(unstakeAmount)}
                  onChange={(e) => handleAmountChange(e, setUnstakeAmount, unstakeAmountRef)}
                  placeholder="0.00"
                  className="w-full bg-black border-2 border-white/20 rounded-lg p-4 text-white text-lg placeholder-gray-400 focus:outline-none focus:border-white"
                  disabled={!selectedStakePeriod}
                />
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-gray-400 text-sm">
                    {selectedPeriodBalance} TEAM
                  </span>
                  <button
                    type="button"
                    onClick={() => setUnstakeAmount(selectedPeriodFullPrecision)}
                    className="text-white hover:text-gray-300 text-sm font-semibold uppercase"
                    disabled={!selectedStakePeriod}
                  >
                    MAX
                  </button>
                </div>
              </div>

              {/* Get selected stake status */}
              {(() => {
                const selectedStake = allPeriodCommitments.find((c: any) => c.period === selectedStakePeriod);
                const stakeStatus = selectedStake?.status;

                // Pre-committed stakes - allow EES with penalty
                if (stakeStatus === 'pending') {
                  return (
                    <>
                      <button
                        onClick={handleEarlyEndStake}
                        disabled={!selectedStakePeriod || !unstakeAmount || parseFloat(unstakeAmount) <= 0 || isLoading}
                        className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
                          selectedStakePeriod && unstakeAmount && parseFloat(unstakeAmount) > 0 && !isLoading
                            ? 'bg-red-500 text-white hover:bg-red-600'
                            : 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        {isLoading ? (
                          <span className="flex items-center justify-center gap-2">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Processing...
                          </span>
                        ) : (
                          'Early Unstake (3.69% penalty)'
                        )}
                      </button>

                      <div className="p-4 bg-blue-500/20 border border-blue-500/30 rounded-lg mt-4">
                        <p className="text-sm text-blue-400 leading-5">
                          ℹ️ This is a pre-committed stake for a future period. You can early unstake (EES) with a 3.69% penalty. Penalty-free unstaking is only available after the period ends.
                        </p>
                      </div>
                    </>
                  );
                }

                // Active stakes - allow EES with penalty
                if (stakeStatus === 'active') {
                  return (
                    <>
                      <button
                        onClick={handleEarlyEndStake}
                        disabled={!selectedStakePeriod || !unstakeAmount || parseFloat(unstakeAmount) <= 0 || isLoading}
                        className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
                          selectedStakePeriod && unstakeAmount && parseFloat(unstakeAmount) > 0 && !isLoading
                            ? 'bg-red-500 text-white hover:bg-red-600'
                            : 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        {isLoading ? (
                          <span className="flex items-center justify-center gap-2">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Processing...
                          </span>
                        ) : (
                          'Early Unstake (3.69% penalty)'
                        )}
                      </button>

                      <div className="p-4 bg-green-500/20 border border-green-500/30 rounded-lg mt-4">
                        <p className="text-sm text-green-400 leading-5">
                          ✅ This stake is currently active and earning rewards. You can early unstake with a 3.69% penalty, or wait for the BASE stake to end for penalty-free unstaking.
                          <br />
                          <span className="text-xs mt-1 inline-block">
                            Stake ends in:{' '}
                            <span className="font-mono font-semibold">
                              {stakeEndCountdown.days > 0 && `${stakeEndCountdown.days}d `}
                              {stakeEndCountdown.hours}h {stakeEndCountdown.minutes}m {stakeEndCountdown.seconds}s
                            </span>
                          </span>
                        </p>
                      </div>
                    </>
                  );
                }

                // For expired stakes, show withdrawal button (no penalty)
                if (stakeStatus === 'expired') {
                  return (
                    <>
                      <button
                        onClick={handleEndCompleted}
                        disabled={!selectedStakePeriod || !unstakeAmount || parseFloat(unstakeAmount) <= 0 || isLoading}
                        className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
                          selectedStakePeriod && unstakeAmount && parseFloat(unstakeAmount) > 0 && !isLoading
                            ? 'bg-white text-black hover:bg-gray-200'
                            : 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        {isLoading ? (
                          <span className="flex items-center justify-center gap-2">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Processing...
                          </span>
                        ) : (
                          'Unstake TEAM'
                        )}
                      </button>

                      <div className="p-4 bg-white/5 border border-white/20 rounded-lg mt-4">
                        <p className="text-sm text-gray-300">
                          ✅ BASE stake has ended. You can now unstake without penalty.
                        </p>
                      </div>
                    </>
                  );
                }

                // Default: no action available
                return null;
              })()}
            </div>
          </div>
        </TabsContent>

        {/* Rewards Tab */}
        <TabsContent value="rewards" className="mt-0">
          <RewardsClaimSection
            currentPeriod={completedPeriod}
            actualCurrentPeriod={currentPeriod}
            allPeriodCommitments={allPeriodCommitments}
            periodRewardsData={periodRewardsData}
            isLoadingRewards={isLoadingRewards}
            selectedClaimPeriod={selectedClaimPeriod}
            setSelectedClaimPeriod={setSelectedClaimPeriod}
            setRewardsLoaded={setRewardsLoaded}
            selectedClaimStakeID={selectedClaimStakeID}
            setSelectedClaimStakeID={setSelectedClaimStakeID}
            isLoading={isLoading}
            prepareClaim={prepareClaim}
            claimRewards={claimRewards}
            isStakingPeriod={isStakingPeriod}
            stakeEndCountdown={stakeEndCountdown}
            tokenPrices={tokenPrices}
            toast={toast}
            getTxUrl={getTxUrl}
            isUserRejection={isUserRejection}
          />
        </TabsContent>
      </Tabs>

      {/* Early Unstaking Warning Dialog */}
      <Dialog open={showEarlyUnstakeDialog} onOpenChange={setShowEarlyUnstakeDialog}>
        <DialogContent className="bg-black border-2 border-red-500/50 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400 text-2xl">
              <AlertTriangle className="w-6 h-6" />
              EARLY UNSTAKING WARNING
            </DialogTitle>
            <DialogDescription className="space-y-4 pt-4">
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300 font-medium">Unstaking Amount:</span>
                  <span className="text-white font-bold text-lg">{earlyUnstakeDetails.amount} TEAM</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-red-300 font-medium">Penalty (3.69%):</span>
                  <span className="text-red-400 font-bold text-lg">{earlyUnstakeDetails.penalty} TEAM</span>
                </div>
                <div className="h-px bg-red-500/30" />
                <div className="flex justify-between items-center">
                  <span className="text-gray-300 font-medium">You Will Receive:</span>
                  <span className="text-white font-bold text-xl">{earlyUnstakeDetails.afterPenalty} TEAM</span>
                </div>
              </div>
              <p className="text-gray-400 text-sm text-center">
                Are you sure you want to continue?
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button 
              onClick={() => setShowEarlyUnstakeDialog(false)}
              className="bg-blue-600 hover:bg-blue-700 text-white border-0"
            >
              Cancel
            </Button>
            <Button 
              onClick={confirmEarlyEndStake}
              className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border-2 border-red-500/50"
            >
              Confirm Unstake
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Rewards Claim Component
function RewardsClaimSection({
  currentPeriod,
  actualCurrentPeriod,
  allPeriodCommitments,
  periodRewardsData,
  isLoadingRewards,
  selectedClaimPeriod,
  setSelectedClaimPeriod,
  setRewardsLoaded,
  selectedClaimStakeID,
  setSelectedClaimStakeID,
  isLoading,
  prepareClaim,
  claimRewards,
  isStakingPeriod,
  stakeEndCountdown,
  tokenPrices,
  toast,
  getTxUrl,
  isUserRejection,
}: any) {
  const [loadingToken, setLoadingToken] = useState<string | null>(null);

  // Format reward amount with smart decimal places
  const formatRewardAmount = (value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return '0';
    
    let formatted: string;
    if (num >= 10) {
      // For numbers >= 10, show 2 decimal places
      formatted = num.toFixed(2);
    } else if (num >= 1) {
      // For numbers >= 1, show 4 decimal places
      formatted = num.toFixed(4);
    } else if (num > 0) {
      // For small numbers, show up to 8 decimal places, removing trailing zeros
      formatted = num.toFixed(8).replace(/\.?0+$/, '');
    } else {
      formatted = '0';
    }
    
    return formatNumberWithCommas(formatted);
  };

  // Calculate USD value for a token
  const calculateUSDValue = (token: string, amount: bigint): string => {
    const tokenAddress = REWARD_TOKEN_ADDRESSES[token as RewardToken];
    const price = tokenPrices?.[tokenAddress]?.price || 0;
    const tokenAmount = parseFloat(formatUnits(amount, 8));
    const usdValue = tokenAmount * price;
    
    if (usdValue >= 1) {
      return `$${formatNumberWithCommas(usdValue.toFixed(2))}`;
    } else if (usdValue > 0) {
      return `$${usdValue.toFixed(4)}`;
    }
    return '$0.00';
  };

  const currentPeriodData = selectedClaimPeriod !== null ? periodRewardsData[selectedClaimPeriod] : null;

  const handlePrepareClaim = async (ticker: string) => {
    setLoadingToken(ticker);
    try {
      const { hash } = await prepareClaim(ticker);
      
      const txUrl = getTxUrl(hash);
      toast({
        title: "Success!",
        description: `Successfully prepared ${ticker} rewards! Click to view transaction.`,
        variant: "success",
        action: (
          <Button
            variant="outline"
            size="sm"
            className="bg-white text-black hover:bg-gray-100 border-white"
            onClick={() => window.open(txUrl, '_blank')}
          >
            View TX
          </Button>
        ),
      });
      // Wait a bit for blockchain to update, then refetch rewards
      setTimeout(async () => {
        setRewardsLoaded(false);
        // Force refetch of prepare status for this specific token
        if (selectedClaimPeriod !== null) {
          const isPreparedNew = await checkPrepareClaimStatus(ticker, BigInt(selectedClaimPeriod));
          setPeriodRewardsData(prev => ({
            ...prev,
            [selectedClaimPeriod]: {
              ...prev[selectedClaimPeriod],
              prepareStatuses: {
                ...prev[selectedClaimPeriod]?.prepareStatuses,
                [ticker]: isPreparedNew,
              },
            },
          }));
        }
      }, 2000);
    } catch (error: any) {
      if (!isUserRejection(error)) {
        // Check if error is due to no rewards (contract reverts without reason)
        const isNoRewardsError = error.message?.includes('reverted without a reason') || 
                                 error.message?.includes('Transaction reverted');
        
        if (isNoRewardsError && selectedClaimPeriod !== null) {
          // Silently mark as prepared with 0 amount so it gets hidden
          setPeriodRewardsData(prev => ({
            ...prev,
            [selectedClaimPeriod]: {
              ...prev[selectedClaimPeriod],
              prepareStatuses: {
                ...prev[selectedClaimPeriod]?.prepareStatuses,
                [ticker]: true,
              },
              claimableAmounts: {
                ...prev[selectedClaimPeriod]?.claimableAmounts,
                [ticker]: 0n,
              },
            },
          }));
        } else {
          // Show error toast for other types of errors
          toast({
            title: "Error",
            description: error.message || `Failed to prepare ${ticker} rewards`,
            variant: "destructive",
          });
        }
      }
    } finally {
      setLoadingToken(null);
    }
  };

  const handleClaim = async (ticker: string) => {
    if (!selectedClaimPeriod) return;
    setLoadingToken(ticker);
    try {
      const period = BigInt(selectedClaimPeriod);
      const stakeID = BigInt(selectedClaimPeriod);
      const { hash } = await claimRewards(period, ticker, stakeID);
      
      const txUrl = getTxUrl(hash);
      toast({
        title: "Success!",
        description: `Successfully claimed ${ticker} rewards! Click to view transaction.`,
        variant: "success",
        action: (
          <Button
            variant="outline"
            size="sm"
            className="bg-white text-black hover:bg-gray-100 border-white"
            onClick={() => window.open(txUrl, '_blank')}
          >
            View TX
          </Button>
        ),
      });
      // Wait a bit for blockchain to update, then refetch rewards
      setTimeout(() => {
        setRewardsLoaded(false);
      }, 2000);
    } catch (error: any) {
      if (!isUserRejection(error)) {
        toast({
          title: "Error",
          description: error.message || `Failed to claim ${ticker} rewards`,
          variant: "destructive",
        });
      }
    } finally {
      setLoadingToken(null);
    }
  };

    return (
    <div className="border-2 border-white/50 rounded-b-xl rounded-tr-xl rounded-tl-xl p-8 bg-black -mt-0.5 space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">Claim Rewards</h2>
        <p className="text-gray-400 text-sm">
          Claim your earned rewards from completed staking periods
          </p>
        </div>

      {/* Period Selection */}
      {isLoadingRewards ? (
        <div className="p-4 bg-white/5 border border-white/20 rounded-lg">
          <p className="text-sm text-gray-400 text-center">
            <Loader2 className="w-4 h-4 inline animate-spin mr-2 text-white" />
            Loading reward data...
          </p>
        </div>
      ) : allPeriodCommitments && allPeriodCommitments.length > 0 ? (
        <div className="p-4 bg-white/5 border border-white/20 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold text-white">Select Period to Claim From</div>
            <div className="text-xs text-gray-400">{allPeriodCommitments.length} stake{allPeriodCommitments.length !== 1 ? 's' : ''}</div>
          </div>
          
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {allPeriodCommitments.map(({ period, stakeNumber, status }: any) => {
              const isSelected = selectedClaimPeriod === period;
              const periodData = periodRewardsData[period];
              const totalClaimable = periodData?.totalClaimable || 0;
              const hasAnyRewards = periodData?.hasAnyRewards || false;
              
              return (
                <label 
                  key={period} 
                  className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                    isSelected 
                      ? 'bg-white/10 border border-white/40' 
                      : 'bg-white/5 border border-transparent hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="selectedPeriod"
                      checked={isSelected}
                      onChange={() => setSelectedClaimPeriod(period)}
                      className="w-4 h-4 accent-green-400 cursor-pointer"
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-300 font-medium">Stake {stakeNumber}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        status === 'active' ? 'bg-green-500/20 text-green-300' :
                        status === 'pending' ? 'bg-blue-500/20 text-blue-300' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {status === 'active' ? 'Active' : status === 'pending' ? 'Pre-committed' : 'Completed'}
                    </span>
                  </div>
                </div>
                  <div className="text-sm">
                    {hasAnyRewards ? (
                      <span className="text-white font-semibold">
                        {totalClaimable > 0 ? 'Rewards to claim' : 'Claimed ✓'}
                      </span>
                    ) : (
                      <span className="text-gray-500">No rewards yet</span>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="p-4 bg-white/5 border border-white/20 rounded-lg">
          <p className="text-sm text-gray-400 text-center">
            No stakes found. Stake TEAM to earn rewards!
          </p>
        </div>
      )}

      {/* Rewards for Selected Period */}
      {selectedClaimPeriod && currentPeriodData && (
        <>
          {/* Info Banner for Active Period */}
          {isStakingPeriod && allPeriodCommitments.find((c: any) => c.period === selectedClaimPeriod)?.status === 'active' && (
            <div className="flex items-start gap-3 p-4 bg-yellow-500/20 border border-yellow-500/30 rounded-lg leading-5">
              <Info className="w-5 h-5 text-yellow-400 flex-shrink-0" />
              <p className="text-sm text-yellow-400 leading-5">
                Current staking period rewards will be available after the period ends in:{' '}
                <span className="font-mono font-semibold">
                  {stakeEndCountdown.days > 0 && `${stakeEndCountdown.days}d `}
                  {stakeEndCountdown.hours}h {stakeEndCountdown.minutes}m {stakeEndCountdown.seconds}s
                </span>
          </p>
        </div>
          )}

          {/* Rewards Section - Show all reward tokens with their status */}
          {(() => {
            if (!currentPeriodData?.claimableAmounts || !currentPeriodData?.claimedStatuses || !currentPeriodData?.prepareStatuses) {
              return null;
            }

            // Check if this is a completed period (not active, not pending)
            const selectedStake = allPeriodCommitments.find((c: any) => c.period === selectedClaimPeriod);
            const isCompletedPeriod = selectedStake && selectedStake.status !== 'active' && selectedStake.status !== 'pending';

            // For completed periods, always show rewards section (users need to see "Prepare Claim" buttons)
            // For active/pending periods, only show if there are actual rewards
            if (!isCompletedPeriod) {
              const hasAnyRewardActivity = REWARD_TOKENS.some((token) => {
              const amount = currentPeriodData.claimableAmounts[token] || 0n;
              const hasClaimed = currentPeriodData.claimedStatuses[token];
              const isPrepared = currentPeriodData.prepareStatuses[token];
                return isPrepared || hasClaimed || amount > 0n;
            });

              if (!hasAnyRewardActivity) return null;
            }

            return (
        <div>
          <h3 className="text-lg font-semibold text-white mb-3">
                  Your Rewards
          </h3>
          
          <div className="space-y-2">
                  {REWARD_TOKENS.map((token) => {
                const amount = currentPeriodData.claimableAmounts?.[token] || 0n;
                const hasClaimed = currentPeriodData.claimedStatuses?.[token];
                const isPrepared = currentPeriodData.prepareStatuses?.[token];
                const isLoadingThisToken = loadingToken === token;
                
                // Skip tokens that are prepared but have 0 rewards and haven't been claimed
                if (isPrepared && amount === 0n && !hasClaimed) {
                  return null;
                }
                
                // Rewards not prepared yet - show "Prepare Claim" button
                // Note: If prepare fails due to 0 balance, the error will be shown
                if (!isPrepared && !hasClaimed) {
              return (
                    <div key={token} className="p-4 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs text-yellow-400 font-semibold mb-1">⏳ {token} Rewards Pending</div>
                          <div className="text-sm text-yellow-300/80">Claims need to be prepared first</div>
                          <div className="text-xs text-yellow-500/70 mt-1">Anyone can prepare by clicking →</div>
                          </div>
                        <button
                          onClick={() => handlePrepareClaim(token)}
                          disabled={isLoadingThisToken}
                          className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                            !isLoadingThisToken
                              ? 'bg-white hover:bg-gray-200 text-black'
                              : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          {isLoadingThisToken ? (
                            <span className="flex items-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Preparing...
                            </span>
                          ) : (
                            'Prepare Claim'
                          )}
                        </button>
                        </div>
                      </div>
                  );
                }

                // Rewards prepared and claimable (only show if amount > 0)
                if (isPrepared && amount > 0n && !hasClaimed) {
                  return (
                    <div key={token} className="p-4 bg-green-900/30 border border-green-600/40 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs text-green-400 font-semibold mb-1">🎁 {token} Rewards</div>
                          <div className="text-2xl font-bold text-green-300">
                            {formatRewardAmount(formatUnits(amount, 8))} {token}
                          </div>
                          <div className="text-xs text-green-500/70 mt-1">
                            {calculateUSDValue(token, amount)}
                          </div>
                        </div>
                  <button
                          onClick={() => handleClaim(token)}
                          disabled={isLoadingThisToken}
                          className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                            !isLoadingThisToken
                              ? 'bg-green-600 hover:bg-green-700 text-white'
                              : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                          }`}
                    >
                      {isLoadingThisToken ? (
                            <span className="flex items-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Claiming...
                            </span>
                      ) : (
                            'Claim Rewards'
                    )}
                  </button>
                      </div>
                </div>
              );
                }

                // Already claimed
                if (hasClaimed) {
                  return (
                    <div key={token} className="p-3 bg-gray-800/50 border border-gray-600/30 rounded-lg">
                      <p className="text-xs text-gray-400">
                        ✅ {token} rewards already claimed for this stake.
                      </p>
                    </div>
                  );
                }

                // No rewards available and not claimed (prepared but 0 amount)
                return null;
            })}
          </div>
        </div>
            );
          })()}
        </>
      )}
    </div>
  );
}
