'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { usePerpetualPool } from '@/hooks/contracts/usePerpetualPool';
import { useDiamondHands } from '@/hooks/contracts/useDiamondHands';
import { usePool } from '@/context/PoolContext';
import { Loader2, CheckCircle2, AlertCircle, ExternalLink, Gem, AlertTriangle, Lock, ChevronDown } from 'lucide-react';
import { formatEther, parseUnits, parseAbi } from 'viem';
import { useContractRead, useWriteContract, usePublicClient, useWalletClient, useAccount } from 'wagmi';
import { ConnectButton } from './ConnectButton';
import { formatHexDayToUTCDate, formatTickerName } from '@/utils/format';
import { 
  validateAmount, 
  removeCommas, 
  formatNumberWithCommas,
  isValidNumberInput,
  amountToBigInt 
} from '@/utils/validation';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogPortal, DialogOverlay } from '@/components/ui/dialog';
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Cross2Icon } from "@radix-ui/react-icons";
import { Button } from '@/components/ui/button';

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
  BASE3: '0x992678ad242230Dd795107Fee8B572E27083002A',
  eBASE3: '0x992678ad242230Dd795107Fee8B572E27083002A', // Same contract on Ethereum (fork)
  TRIO: '0x7F343C25a6FD8Ce5fac441Cff22be3758EbE1e04',
  eTRIO: '0x7F343C25a6FD8Ce5fac441Cff22be3758EbE1e04', // Same contract on Ethereum (fork)
  LUCKY: '0x4497f24bc4096053C3a5687A051732731b3f631B',
  eLUCKY: '0x4497f24bc4096053C3a5687A051732731b3f631B', // Same contract on Ethereum (fork)
  DECI: '0x196E5f240d26969CFEf464e80C6e423620cc7E40',
  eDECI: '0x196E5f240d26969CFEf464e80C6e423620cc7E40', // Same contract on Ethereum (fork)
};

// Reward Bucket contract addresses for each pool (where penalties accumulate)
const REWARD_BUCKET_CONTRACTS: Record<string, string> = {
  BASE3: '0x3778B2e2D6ADe902058FA4e82424F1A376a3d417',
  eBASE3: '0x3778B2e2D6ADe902058FA4e82424F1A376a3d417', // Same contract on Ethereum (fork)
  TRIO: '0xD71dE2f590C59D3BEc80b5C69898AAfaa2Ab53A9',
  eTRIO: '0xD71dE2f590C59D3BEc80b5C69898AAfaa2Ab53A9', // Same contract on Ethereum (fork)
  LUCKY: '0xE6b296485c2b31d060A6f75D1e9fCC870997BbA3',
  eLUCKY: '0xE6b296485c2b31d060A6f75D1e9fCC870997BbA3', // Same contract on Ethereum (fork)
  DECI: '0xFc9664af5f73d0F347e51cd213B7378b6e7ecaeb',
  eDECI: '0xFc9664af5f73d0F347e51cd213B7378b6e7ecaeb', // Same contract on Ethereum (fork)
};

// Stake Reward Distribution contract addresses for each pool (where users claim rewards)
const STAKE_REWARD_DISTRIBUTION_CONTRACTS: Record<string, string> = {
  BASE3: '0x4C03598b0347C571C71b440F8eBD522553A2cB1B',
  eBASE3: '0x4C03598b0347C571C71b440F8eBD522553A2cB1B', // Same contract on Ethereum (fork)
  TRIO: '0xa5DC9Ae34AB52d877a5727D106e36318AA59E50B',
  eTRIO: '0xa5DC9Ae34AB52d877a5727D106e36318AA59E50B', // Same contract on Ethereum (fork)
  LUCKY: '0x9f17805c3713a2cF3e710Aa7dCe5A2CFB74E9972',
  eLUCKY: '0x9f17805c3713a2cF3e710Aa7dCe5A2CFB74E9972', // Same contract on Ethereum (fork)
  DECI: '0x9844B2bD1e05F04A173edf6ee4Cc83d52350b664',
  eDECI: '0x9844B2bD1e05F04A173edf6ee4Cc83d52350b664', // Same contract on Ethereum (fork)
};

// ABI for Reward Bucket contract
const REWARD_BUCKET_ABI = parseAbi([
  'function getClaimableAmount(address user, uint256 period, string memory ticker, uint256 stakeID) public view returns (uint256, address)',
  'function getPeriodRedemptionRates(string memory ticker, uint256 period) public view returns (uint256)',
  'function periodEndBalance(string memory ticker, uint256 period) public view returns (uint256)',
  'function prepareClaim(string memory ticker, uint256 period) external',
]);

// ABI for DHStakeRewardDistribution contract
const DH_STAKE_REWARD_DISTRIBUTION_ABI = parseAbi([
  'function claimRewards(uint256 period, string memory ticker, uint256 stakeID) external',
  'function didUserStakeClaimFromPeriod(address user, uint256 stakeID, uint256 period, string memory ticker) public view returns (bool)',
]);

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
  
  // 🔍 LOG: StakeInterface pool selection
  console.log('🔍 [StakeInterface] Pool selection', {
    selectedTicker,
    selectedPoolAddress: selectedPool.contractAddress,
    selectedPoolName: selectedPool.name,
  });
  
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
    claimableHedron,
  } = usePerpetualPool(selectedPool.contractAddress as `0x${string}`, selectedTicker);

  const [redeemAmount, setRedeemAmount] = useState('');
  const [mintAmount, setMintAmount] = useState('');
  const [withdrawAmounts, setWithdrawAmounts] = useState<{ [period: number]: string }>({});
  const [lockAmount, setLockAmount] = useState('');
  const [timeRemaining, setTimeRemaining] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [reloadPhaseTimeRemaining, setReloadPhaseTimeRemaining] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [showEarlyWithdrawDialog, setShowEarlyWithdrawDialog] = useState(false);
  const [dhUnlockDialogOpen, setDhUnlockDialogOpen] = useState(false);
  const [dhLockDialogOpen, setDhLockDialogOpen] = useState(false);
  const [earlyWithdrawDetails, setEarlyWithdrawDetails] = useState({
    amount: '',
    penalty: '',
    penaltyPercentage: '',
    afterPenalty: '',
  });
  const redeemAmountRef = useRef<HTMLInputElement>(null);
  const mintAmountRef = useRef<HTMLInputElement>(null);
  const withdrawAmountRef = useRef<HTMLInputElement>(null);
  const lockAmountRef = useRef<HTMLInputElement>(null);
  
  // Scroll indicator states
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);
  const infoScrollRef = useRef<HTMLDivElement>(null);

  // Period-specific staking amounts for accurate reward calculations
  const [userStakedForActivePeriod, setUserStakedForActivePeriod] = useState<bigint>(0n);
  const [globalStakedForActivePeriod, setGlobalStakedForActivePeriod] = useState<bigint>(0n);
  const [userStakedForNextPeriod, setUserStakedForNextPeriod] = useState<bigint>(0n);
  const [globalStakedForNextPeriod, setGlobalStakedForNextPeriod] = useState<bigint>(0n);
  const [allPeriodCommitments, setAllPeriodCommitments] = useState<{period: number, stakeNumber: number, amount: string, status: 'active' | 'pending' | 'expired'}[]>([]);
  const [selectedStakePeriod, setSelectedStakePeriod] = useState<number | null>(null); // Selected stake period for withdrawal
  const [loadedDataPool, setLoadedDataPool] = useState<string>(''); // Track which pool the data is for
  const [loadedPeriodsPool, setLoadedPeriodsPool] = useState<string>(''); // Track which pool periods data is loaded for
  const [isLoadingStakes, setIsLoadingStakes] = useState(false); // Loading state for stakes
  const [isMintingHedron, setIsMintingHedron] = useState(false); // Loading state for minting hedron
  const [isEndingStake, setIsEndingStake] = useState(false); // Loading state for ending stake
  const [historicalRewards, setHistoricalRewards] = useState<{period: number, rewards: string, claimed: boolean, globalStaked: string}[]>([]); // Rewards for all stakes
  const [allHistoricalPeriods, setAllHistoricalPeriods] = useState<{period: number, stakeNumber: number, status: 'active' | 'pending' | 'expired', globalStaked: string, rewards: string}[]>([]); // All periods
  const [loadedHistoricalPool, setLoadedHistoricalPool] = useState<string>(''); // Track which pool historical data is loaded for
  
  // Multi-token rewards support
  const SUPPORTED_REWARD_TOKENS = ['HEX', 'MAXI', 'HDRN', 'BASE', 'TRIO', 'LUCKY', 'DECI', 'TEAM', 'ICSA'];
  const [tokenRewards, setTokenRewards] = useState<{
    token: string;
    claimableAmount: string;
    periodEndBalance: string;
    hasClaimed: boolean;
  }[]>([]);
  const [isClaimingRewards, setIsClaimingRewards] = useState<{ [token: string]: boolean }>({}); // Loading state per token
  const [isPreparingClaims, setIsPreparingClaims] = useState<{ [token: string]: boolean }>({}); // Loading state per token

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
    getHistoricalPeriods,
    calculatePenalty,
    withdrawCompleted,
    withdrawEarly,
    approvePoolToken,
    lockTokens,
  } = useDiamondHands(
    dhContractAddress || '0x0000000000000000000000000000000000000000' as `0x${string}`,
    selectedPool.contractAddress as `0x${string}`
  );

  // Get user account
  const { address: userAddress } = useAccount();

  // Get reward bucket and distribution addresses for the selected pool
  const rewardBucketAddressForPool = REWARD_BUCKET_CONTRACTS[selectedTicker] as `0x${string}` | undefined;
  const stakeRewardDistributionAddressForPool = STAKE_REWARD_DISTRIBUTION_CONTRACTS[selectedTicker] as `0x${string}` | undefined;

  // Contract write for claiming rewards
  const { writeContractAsync: claimRewardsWrite } = useWriteContract();
  
  // Contract write for preparing claims
  const { writeContractAsync: prepareClaimWrite } = useWriteContract();

  // Get public client for batch reading rewards
  const publicClient = usePublicClient();

  // Threshold for showing detailed countdown (days)
  // Change this number to adjust when the HH:MM:SS countdown appears
  const COUNTDOWN_THRESHOLD_DAYS = 30;

  // Check if reload phase is over (matches contract requirement: current_day > RELOAD_PHASE_END)
  // Add 1 day to reload phase end to get the actual end time
  const isReloadPhaseOver = currentHexDay && reloadPhaseEnd ? currentHexDay > (reloadPhaseEnd + 1n) : false;
  
  // Only show "Start the Stake" button when:
  // 1. Stake is definitively NOT active (false, not undefined)
  // 2. Reload phase is definitively over
  // 3. We have the data loaded (currentHexDay exists)
  const shouldShowStartStake = stakeIsActive === false && isReloadPhaseOver && currentHexDay !== undefined;
  const canStartStake = shouldShowStartStake;

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

  // Reset period-specific data when pool changes to prevent showing stale data
  useEffect(() => {
    setUserStakedForActivePeriod(0n);
    setGlobalStakedForActivePeriod(0n);
    setUserStakedForNextPeriod(0n);
    setGlobalStakedForNextPeriod(0n);
    setAllPeriodCommitments([]);
    setSelectedStakePeriod(null);
    setWithdrawAmounts({}); // Clear all withdraw amounts
    setTokenRewards([]); // Reset multi-token rewards
    setIsClaimingRewards({}); // Reset claiming states
    setIsPreparingClaims({}); // Reset preparing states
    setLoadedDataPool(''); // Mark data as invalid
    setLoadedPeriodsPool(''); // Mark periods data as invalid - will reload on next dialog open
    setLoadedHistoricalPool(''); // Mark historical data as invalid - will reload on next dialog open
    setIsLoadingStakes(false); // Not loading until dialog opens
  }, [selectedTicker, dhContractAddress]);

  // Reset loaded data when dialog closes so it reloads fresh data on next open
  useEffect(() => {
    if (!dhUnlockDialogOpen) {
      setLoadedPeriodsPool('');
      setLoadedDataPool('');
      setLoadedHistoricalPool('');
      setIsLoadingStakes(false);
    }
  }, [dhUnlockDialogOpen]);

  // Fetch period-specific staking amounts when dialog opens
  useEffect(() => {
    const fetchPeriodAmounts = async () => {
      // Only fetch when dialog is open and we have required data
      if (!dhUnlockDialogOpen || !currentPeriod || !getActiveStakingPeriod || !getUserStakedForPeriod || !getGlobalStakedForPeriod) {
        return;
      }

      // Skip if already loaded for this pool
      if (loadedDataPool === selectedPool.ticker) {
        return;
      }

      const poolTicker = selectedPool.ticker; // Capture current pool

      try {
        const activePeriod = await getActiveStakingPeriod();
        if (activePeriod === null) return;

        // Calculate next staking period (active + 2 for odd periods, active + 1 for even periods)
        const nextStakingPeriod = (activePeriod as bigint) % 2n === 1n 
          ? (activePeriod as bigint) + 2n  // If odd (staking), next staking is +2
          : (activePeriod as bigint) + 1n; // If even (reload), next staking is +1

        const [userAmountActive, globalAmountActive, userAmountNext, globalAmountNext] = await Promise.all([
          getUserStakedForPeriod(activePeriod),
          getGlobalStakedForPeriod(activePeriod),
          getUserStakedForPeriod(nextStakingPeriod),
          getGlobalStakedForPeriod(nextStakingPeriod)
        ]);

        // Only update if we're still on the same pool
        if (poolTicker === selectedPool.ticker) {
        setUserStakedForActivePeriod(userAmountActive);
        setGlobalStakedForActivePeriod(globalAmountActive);
        setUserStakedForNextPeriod(userAmountNext);
        setGlobalStakedForNextPeriod(globalAmountNext);
          setLoadedDataPool(poolTicker); // Mark data as valid for this pool
        }
      } catch (error) {
        // Silently handle error
      }
    };

    fetchPeriodAmounts();
  }, [dhUnlockDialogOpen, currentPeriod, getActiveStakingPeriod, getUserStakedForPeriod, getGlobalStakedForPeriod, selectedPool.ticker, loadedDataPool]);

  // Fetch ALL stakes when dialog opens
  useEffect(() => {
    const fetchAllStakesByPeriod = async () => {
      // Only fetch when dialog is opened and we have required data
      if (!dhUnlockDialogOpen || !currentPeriod || !getAllUserStakes || !dhContractAddress) {
        return;
      }

      // Only fetch if we haven't loaded for this pool yet
      if (loadedPeriodsPool === selectedPool.ticker) {
        setIsLoadingStakes(false);
        return;
      }

      setIsLoadingStakes(true);

      try {
        const allStakes = await getAllUserStakes();
        
        // Group stakes by period and sum amounts
        const periodMap = new Map<number, bigint>();
        
        allStakes.forEach((stake) => {
          const period = Number(stake.expiry);
          const existing = periodMap.get(period) || 0n;
          periodMap.set(period, existing + stake.balance);
        });

        // Convert to array, filter odd periods only, and format for display with status
        const current = Number(currentPeriod);
        const formatted = Array.from(periodMap.entries())
          .filter(([period]) => period % 2 === 1) // Only odd periods (staking periods)
          .map(([period, amount]) => {
            // Determine status based on current period
            let status: 'active' | 'pending' | 'expired';
            if (period < current) {
              status = 'expired';
            } else if (period === current) {
              status = 'active';
          } else {
              status = 'pending';
            }
            
            return {
              period,
              stakeNumber: (period + 1) / 2, // Calculate stake number from period: 1→1, 3→2, 5→3, etc.
              amount: (Number(amount) / 1e8).toString(),
              status,
            };
          })
          .sort((a, b) => a.stakeNumber - b.stakeNumber); // Sort by stake number ascending (oldest first)

        setAllPeriodCommitments(formatted);
        setLoadedPeriodsPool(selectedPool.ticker); // Mark as loaded for this pool
        
        // Auto-select stake: priority is Active → Expired → Pending
        if (formatted.length > 0) {
          const activeStake = formatted.find(s => s.status === 'active');
          const expiredStake = formatted.find(s => s.status === 'expired');
          const pendingStake = formatted.find(s => s.status === 'pending');
          
          const defaultStake = activeStake || expiredStake || pendingStake || formatted[0];
          setSelectedStakePeriod(defaultStake.period);
        }
      } catch (error) {
        // Silently handle error
      } finally {
        setIsLoadingStakes(false);
      }
    };

    fetchAllStakesByPeriod();
  }, [dhUnlockDialogOpen, currentPeriod, getAllUserStakes, dhContractAddress, selectedPool.ticker, loadedPeriodsPool]);

  // Fetch rewards for ALL supported tokens when selected stake changes
  useEffect(() => {
    const fetchAllTokenRewards = async () => {
      if (!selectedStakePeriod || !dhUnlockDialogOpen || !publicClient || !rewardBucketAddressForPool || !stakeRewardDistributionAddressForPool || !userAddress) {
        return;
      }

      try {
        const stakedTokenTicker = selectedTicker.replace(/^e/, '').replace(/\d+$/, ''); // The token that was staked
        
        // Fetch rewards for all supported tokens in parallel
        const rewardsData = await Promise.all(
          SUPPORTED_REWARD_TOKENS.map(async (rewardToken) => {
            try {
              // Get claimable amount
              const claimableData = await publicClient.readContract({
                address: rewardBucketAddressForPool,
                abi: REWARD_BUCKET_ABI,
                functionName: 'getClaimableAmount',
                args: [userAddress, BigInt(selectedStakePeriod), rewardToken, BigInt(selectedStakePeriod)],
              }) as any;

              const claimableAmount = Array.isArray(claimableData) && claimableData.length >= 1 
                ? (Number(claimableData[0] as bigint) / 1e8).toString()
                : '0';

              // Get period end balance (check if prepared)
              const periodBalance = await publicClient.readContract({
                address: rewardBucketAddressForPool,
                abi: REWARD_BUCKET_ABI,
                functionName: 'periodEndBalance',
                args: [rewardToken, BigInt(selectedStakePeriod)],
              }) as bigint;

              const periodEndBalance = (Number(periodBalance) / 1e8).toString();

              // Check if already claimed
              const hasClaimed = await publicClient.readContract({
                address: stakeRewardDistributionAddressForPool,
                abi: DH_STAKE_REWARD_DISTRIBUTION_ABI,
                functionName: 'didUserStakeClaimFromPeriod',
                args: [userAddress, BigInt(selectedStakePeriod), BigInt(selectedStakePeriod), rewardToken],
              }) as boolean;

              return {
                token: rewardToken,
                claimableAmount,
                periodEndBalance,
                hasClaimed: hasClaimed || false,
              };
            } catch (error) {
              // If error, return zero values for this token
              return {
                token: rewardToken,
                claimableAmount: '0.00',
                periodEndBalance: '0.00',
                hasClaimed: false,
              };
            }
          })
        );

        // Filter to only show tokens with either:
        // 1. Claimable rewards > 0, OR
        // 2. Period end balance > 0 (prepared but maybe user has no rewards), OR
        // 3. Already claimed (show that they claimed)
        const tokensWithRewards = rewardsData.filter(
          r => parseFloat(r.claimableAmount) > 0 || parseFloat(r.periodEndBalance) > 0 || r.hasClaimed
        );

        setTokenRewards(tokensWithRewards);
      } catch (error) {
        // Silent error handling
        setTokenRewards([]);
      }
    };

    fetchAllTokenRewards();
  }, [selectedStakePeriod, dhUnlockDialogOpen, publicClient, rewardBucketAddressForPool, stakeRewardDistributionAddressForPool, userAddress, selectedTicker, SUPPORTED_REWARD_TOKENS]);

  // Fetch ALL historical periods (GLOBAL - not just user's periods) when dialog opens
  useEffect(() => {
    const fetchAllHistoricalPeriods = async () => {
      if (!dhUnlockDialogOpen || !publicClient || !rewardBucketAddressForPool || !currentPeriod || !getGlobalStakedForPeriod) {
        return;
      }

      // Only fetch if we haven't loaded data for this pool yet
      if (loadedHistoricalPool === selectedPool.ticker) {
        return;
      }

      try {
        const ticker = selectedTicker.replace(/^e/, '').replace(/\d+$/, '');
        const currentPeriodNum = Number(currentPeriod);
        
        // Get all odd periods from 1 to current period, PLUS the next period (pending)
        const allPeriods: number[] = [];
        for (let i = 1; i <= currentPeriodNum; i += 2) {
          allPeriods.push(i);
        }
        // Add next staking period (pending)
        const nextStakingPeriod = currentPeriodNum % 2 === 1 
          ? currentPeriodNum + 2  // If current is odd (staking), next is +2
          : currentPeriodNum + 1; // If current is even (reload), next is +1
        allPeriods.push(nextStakingPeriod);

        const periodsData = await Promise.all(
          allPeriods.map(async (period) => {
            try {
              // Get total period rewards from reward bucket (GLOBAL)
              const periodRewards = await publicClient.readContract({
                address: rewardBucketAddressForPool,
                abi: REWARD_BUCKET_ABI,
                functionName: 'periodEndBalance',
                args: [ticker, BigInt(period)],
              }) as bigint;

              // Get global staked amount for this period (GLOBAL)
              const globalStaked = await getGlobalStakedForPeriod(BigInt(period));

              // Calculate stake number and status
              const stakeNumber = (period + 1) / 2;
              let status: 'active' | 'pending' | 'expired';
              if (period < currentPeriodNum) {
                status = 'expired';
              } else if (period === currentPeriodNum) {
                status = 'active';
        } else {
                status = 'pending';
              }

              const formattedGlobalStaked = globalStaked 
                ? formatNumberSmart(Number(globalStaked) / 1e8)
                : '0';

              // For active period, we'll use the live reward bucket balance instead of periodEndBalance
              const formattedRewards = formatNumberSmart(Number(periodRewards) / 1e8);

              return {
                period,
                stakeNumber,
                status,
                globalStaked: formattedGlobalStaked,
                rewards: formattedRewards,
              };
      } catch (error) {
              const stakeNumber = (period + 1) / 2;
              let status: 'active' | 'pending' | 'expired';
              if (period < currentPeriodNum) {
                status = 'expired';
              } else if (period === currentPeriodNum) {
                status = 'active';
              } else {
                status = 'pending';
              }

              return {
                period,
                stakeNumber,
                status,
                globalStaked: '0.00',
                rewards: '0.00',
              };
            }
          })
        );

        // Sort by period ascending (oldest first)
        periodsData.sort((a, b) => a.period - b.period);
        
        setAllHistoricalPeriods(periodsData);
        setLoadedHistoricalPool(selectedPool.ticker); // Mark as loaded for this pool
      } catch (error) {
        // Silently handle error
      }
    };

    fetchAllHistoricalPeriods();
  }, [dhUnlockDialogOpen, currentPeriod, publicClient, rewardBucketAddressForPool, selectedTicker, getGlobalStakedForPeriod, loadedHistoricalPool, selectedPool.ticker]);

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
    if (!stakeIsActive || !stakeEndDay) {
      return;
    }

    const updateCountdown = () => {
      // Calculate deadline from contract's stakeEndDay (end of that HEX day at 23:59:59 UTC)
      // HEX launch timestamp: December 3, 2019 at 00:00:00 UTC
      const HEX_LAUNCH_TIMESTAMP = 1575331200;
      const SECONDS_PER_DAY = 86400;
      
      // Calculate end of the stake end day (23:59:59 UTC)
      const deadlineTimestamp = HEX_LAUNCH_TIMESTAMP + ((Number(stakeEndDay) + 1) * SECONDS_PER_DAY) - 1;
      
      // Get the actual current time in seconds
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const secondsRemaining = deadlineTimestamp - currentTimestamp;

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
    if (stakeIsActive || !reloadPhaseEnd) {
      return;
    }

    const updateReloadCountdown = () => {
      // HEX launch timestamp: December 2, 2019 at 00:00:00 UTC
      const HEX_LAUNCH_TIMESTAMP = 1575331200;
      const SECONDS_PER_DAY = 86400;
      
      // Calculate when the reload phase end day starts (at midnight UTC)
      // Add 1 day to the contract's reload phase end to get the actual end time
      const reloadEndTimestamp = HEX_LAUNCH_TIMESTAMP + ((Number(reloadPhaseEnd) + 1) * SECONDS_PER_DAY);
      
      // Get the actual current time in seconds (not the HEX day from contract)
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const secondsRemaining = reloadEndTimestamp - currentTimestamp;

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
  }, [reloadPhaseEnd, stakeIsActive]);

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

  // Smart number formatting - only show decimals when needed
  const formatNumberSmart = (value: number): string => {
    const hasDecimals = value % 1 !== 0;
    return value.toLocaleString('en-US', {
      minimumFractionDigits: hasDecimals ? 2 : 0,
      maximumFractionDigits: 2,
    });
  };

  // Format user balance for display
  const formattedBalance = userBalance 
    ? formatNumberSmart(Number(userBalance) / 1e8)
    : '0';
  
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
      return formatNumberSmart(redeemableHearts / 1e8);
    } catch {
      return '0';
    }
  };

  // Format HEX balance
  const formattedHexBalance = hexBalance 
    ? formatNumberSmart(Number(hexBalance) / 1e8)
    : '0';
  
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
      return formatNumberSmart(tokensInMini / 1e8);
    } catch {
      return '0';
    }
  };

  // Check if minting phase is active
  // Add 1 day to reload phase end to get the actual end time
  const isMintingPhaseActive = currentHexDay && reloadPhaseEnd && currentHexDay <= (reloadPhaseEnd + 1n) && !stakeIsActive;

  const handleEndStake = async () => {
    try {
      setIsEndingStake(true);
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
      setIsEndingStake(false);
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
      setIsMintingHedron(true);
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
        `Successfully redeemed ${formatNumberWithCommas(cleanAmount)} ${tokenSymbol ? formatTickerName(tokenSymbol) : 'tokens'} for ${formatTickerName(selectedPool.ticker)}!`,
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
    // Validate amount
    const validation = validateAmount(mintAmount, {
      fieldName: 'Mint amount',
      maxDecimals: 8
    });
    
    if (!validation.isValid) {
      onTransactionError?.(validation.error || 'Please enter a valid amount to approve');
      return;
    }

    const cleanAmount = removeCommas(mintAmount);

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
    // Validate amount
    const validation = validateAmount(mintAmount, {
      fieldName: 'Pledge amount',
      maxDecimals: 8
    });
    
    if (!validation.isValid) {
      onTransactionError?.(validation.error || 'Please enter a valid amount to pledge');
      return;
    }

    const cleanAmount = removeCommas(mintAmount);

    try {
      onTransactionStart?.();
      
      // Convert to hearts (8 decimals)
      const [whole, decimal = ''] = cleanAmount.split('.');
      const paddedDecimal = decimal.padEnd(8, '0').slice(0, 8);
      const amountInHearts = BigInt(whole + paddedDecimal);
      
      const result = await pledgeHex(amountInHearts);
      
      onTransactionSuccess?.(
        `Successfully pledged ${formatNumberWithCommas(cleanAmount)} HEX and minted ${calculateMintableTokens(cleanAmount)} ${tokenSymbol ? formatTickerName(tokenSymbol) : ''}!`,
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

  // Helper to get withdraw amount for current stake
  const getWithdrawAmount = () => {
    if (selectedStakePeriod === null) return '';
    return withdrawAmounts[selectedStakePeriod] || '';
  };

  // Helper to set withdraw amount for current stake
  const setWithdrawAmount = (amount: string) => {
    if (selectedStakePeriod === null) return;
    setWithdrawAmounts(prev => ({
      ...prev,
      [selectedStakePeriod]: amount
    }));
  };

  const handleDHWithdraw = async () => {
    const withdrawAmount = getWithdrawAmount();
    
    // Validate amount
    const validation = validateAmount(withdrawAmount, {
      fieldName: 'Withdraw amount',
      maxBalance: (Number(userStakedAmount || 0n) / 1e8).toString(),
      maxDecimals: 8
    });
    
    if (!validation.isValid) {
      onTransactionError?.(validation.error || 'Please enter a valid amount to withdraw');
      return;
    }

    const cleanAmount = removeCommas(withdrawAmount);

    // Use the selected stake period as stakeID
    if (selectedStakePeriod === null) {
      onTransactionError?.('Please select a stake to withdraw from');
      return;
    }

    // Get the selected stake info to check status
    const selectedStake = allPeriodCommitments.find(s => s.period === selectedStakePeriod);
    if (!selectedStake) {
      onTransactionError?.('Selected stake not found');
      return;
    }

    try {
      onTransactionStart?.();
      
      // Convert to mini (8 decimals)
      const [whole, decimal = ''] = cleanAmount.split('.');
      const paddedDecimal = decimal.padEnd(8, '0').slice(0, 8);
      const amountInMini = BigInt(whole + paddedDecimal);
      
      // Use selected stake period as stakeID
      const stakeID = BigInt(selectedStakePeriod);
      
      // For EXPIRED stakes, withdraw without penalty check
      if (selectedStake.status === 'expired') {
        const result = await withdrawCompleted(stakeID, amountInMini);
        onTransactionSuccess?.(
          `Successfully withdrew ${formatNumberWithCommas(cleanAmount)} ${formatTickerName(selectedPool.ticker)}`,
          result.hash
        );
        setWithdrawAmount('');
        setDhUnlockDialogOpen(false);
      } else {
        // For ACTIVE/PENDING stakes, calculate penalty and show confirmation dialog
        const penalty = await calculatePenalty(amountInMini);
        const penaltyAmount = (Number(penalty) / 1e8).toFixed(2);
        const willReceive = (Number(amountInMini - penalty) / 1e8).toFixed(2);
        const penaltyPercentage = ((Number(penalty) / Number(amountInMini)) * 100).toFixed(2);
        
        // Set early withdraw details and show dialog (store clean values)
        setEarlyWithdrawDetails({
          amount: cleanAmount,
          penalty: penaltyAmount,
          penaltyPercentage: penaltyPercentage,
          afterPenalty: willReceive,
        });
        setShowEarlyWithdrawDialog(true);
        onTransactionEnd?.(); // End loading state while waiting for user confirmation
        return;
      }
    } catch (error: any) {
      onTransactionError?.(
        error?.message || 'Failed to withdraw from Diamond Hands. Please try again.'
      );
    } finally {
      onTransactionEnd?.();
    }
  };

  const handleEarlyDHWithdraw = async () => {
    const withdrawAmount = getWithdrawAmount();
    
    // Validate amount
    const validation = validateAmount(withdrawAmount, {
      fieldName: 'Withdraw amount',
      maxBalance: (Number(userStakedAmount || 0n) / 1e8).toString(),
      maxDecimals: 8
    });
    
    if (!validation.isValid) {
      onTransactionError?.(validation.error || 'Please enter a valid amount to withdraw');
      return;
    }

    const cleanAmount = removeCommas(withdrawAmount);

    try {
      // Convert to mini (8 decimals)
      const [whole, decimal = ''] = cleanAmount.split('.');
      const paddedDecimal = decimal.padEnd(8, '0').slice(0, 8);
      const amountInMini = BigInt(whole + paddedDecimal);
      
      // Calculate penalty - FLAT 20% for all Diamond Hands pools
      // penalty = amount / 5 (which is 20%)
      const penalty = amountInMini / 5n;
      
      const penaltyAmount = (Number(penalty) / 1e8).toFixed(2);
      const willReceive = (Number(amountInMini - penalty) / 1e8).toFixed(2);
      
      // Penalty percentage is always 20%
      const penaltyPercentage = '20.00';
      
      // Show confirmation dialog
      setEarlyWithdrawDetails({
        amount: cleanAmount,
        penalty: formatNumberWithCommas(penaltyAmount),
        penaltyPercentage: penaltyPercentage,
        afterPenalty: formatNumberWithCommas(willReceive),
      });
      setShowEarlyWithdrawDialog(true);
    } catch (error: any) {
      onTransactionError?.(
        error?.message || 'Failed to calculate penalty. Please try again.'
      );
    }
  };

  const confirmEarlyDHWithdraw = async () => {
    // Amount is already clean (no commas), no need to remove them
    const cleanAmount = earlyWithdrawDetails.amount;
    
    // Use the selected stake period as stakeID
    if (selectedStakePeriod === null) {
      onTransactionError?.('Please select a stake to withdraw from');
      return;
    }
    
    try {
      onTransactionStart?.();
      setShowEarlyWithdrawDialog(false);
      
      // Convert to mini (8 decimals)
      const [whole, decimal = ''] = cleanAmount.split('.');
      const paddedDecimal = decimal.padEnd(8, '0').slice(0, 8);
      const amountInMini = BigInt(whole + paddedDecimal);
      
      // Use selected stake period as stakeID
      const stakeID = BigInt(selectedStakePeriod);
      
      const result = await withdrawEarly(stakeID, amountInMini);
      
      onTransactionSuccess?.(
        `Successfully withdrew ${formatNumberWithCommas(cleanAmount)} ${selectedPool.ticker} (with penalty)`,
        result.hash
      );
      
      setWithdrawAmount('');
      setDhUnlockDialogOpen(false); // Close dialog to show success toast
    } catch (error: any) {
      onTransactionError?.(
        error?.message || 'Failed to withdraw from Diamond Hands. Please try again.'
      );
    } finally {
      onTransactionEnd?.();
    }
  };

  // Handle claim rewards for expired stakes (accepts token parameter)
  const handleClaimRewards = async (rewardToken: string, claimableAmount: string) => {
    if (!selectedStakePeriod || !userAddress || !claimRewardsWrite || !stakeRewardDistributionAddressForPool || !publicClient) {
      onTransactionError?.('Unable to claim rewards. Please try again.');
      return;
    }

    try {
      setIsClaimingRewards(prev => ({ ...prev, [rewardToken]: true }));
      onTransactionStart?.();
      
      const txHash = await claimRewardsWrite({
        address: stakeRewardDistributionAddressForPool,
        abi: DH_STAKE_REWARD_DISTRIBUTION_ABI,
        functionName: 'claimRewards',
        args: [BigInt(selectedStakePeriod), rewardToken, BigInt(selectedStakePeriod)],
      });

      // Wait for transaction confirmation
      await publicClient.waitForTransactionReceipt({ hash: txHash });

      onTransactionSuccess?.(
        `Successfully claimed ${claimableAmount} ${rewardToken} rewards!`,
        txHash
      );
      
      // Refetch rewards data for all tokens
      // Trigger re-fetch by incrementing a counter or resetting dependencies
      setTokenRewards([]);
    } catch (error: any) {
      onTransactionError?.(
        error?.message || 'Failed to claim rewards. Please try again.'
      );
    } finally {
      setIsClaimingRewards(prev => ({ ...prev, [rewardToken]: false }));
      onTransactionEnd?.();
    }
  };

  // Handle prepare claim (anyone can call this to prepare rewards for a period)
  const handlePrepareClaim = async (rewardToken: string) => {
    if (!selectedStakePeriod || !prepareClaimWrite || !rewardBucketAddressForPool || !publicClient) {
      onTransactionError?.('Unable to prepare claims. Please try again.');
      return;
    }

    try {
      setIsPreparingClaims(prev => ({ ...prev, [rewardToken]: true }));
      onTransactionStart?.();
      
      const txHash = await prepareClaimWrite({
        address: rewardBucketAddressForPool,
        abi: REWARD_BUCKET_ABI,
        functionName: 'prepareClaim',
        args: [rewardToken, BigInt(selectedStakePeriod)],
      });

      // Wait for transaction confirmation
      await publicClient.waitForTransactionReceipt({ hash: txHash });

      onTransactionSuccess?.(
        `Successfully prepared ${rewardToken} claims for Stake ${((selectedStakePeriod + 1) / 2)}. Users can now claim their rewards!`,
        txHash
      );
      
      // Refetch rewards data for all tokens
      setTokenRewards([]);
    } catch (error: any) {
      onTransactionError?.(
        error?.message || 'Failed to prepare claims. Please try again.'
      );
    } finally {
      setIsPreparingClaims(prev => ({ ...prev, [rewardToken]: false }));
      onTransactionEnd?.();
    }
  };

  // Format Diamond Hands balance
  const formattedDHBalance = userStakedAmount 
    ? formatNumberSmart(Number(userStakedAmount) / 1e8)
    : '0';
  
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
    ? formatNumberSmart(Number(globalStakedAmount) / 1e8)
    : '0';

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
    ? formatNumberSmart(Number(rewardBucketBalance) / 1e8)
    : '0';

  // Calculate reward bucket percentage of total in DH contract
  const rewardBucketPercentage = rewardBucketBalance && globalStakedAmount && Number(globalStakedAmount) > 0
    ? ((Number(rewardBucketBalance) / Number(globalStakedAmount)) * 100).toFixed(2)
    : '0.00';

  // Calculate pending rewards for user (using period-specific amounts)
  const pendingRewards = userStakedForActivePeriod && globalStakedForActivePeriod && rewardBucketBalance && Number(globalStakedForActivePeriod) > 0
    ? formatNumberSmart((Number(userStakedForActivePeriod) / Number(globalStakedForActivePeriod)) * (Number(rewardBucketBalance) / 1e8))
    : '0';

  // Format next period staking amounts (memoized to prevent flashing)
  const formattedUserNextPeriod = useMemo(() =>
    userStakedForNextPeriod
      ? formatNumberSmart(Number(userStakedForNextPeriod) / 1e8)
      : '0',
    [userStakedForNextPeriod]
  );

  const formattedGlobalNextPeriod = useMemo(() =>
    globalStakedForNextPeriod
      ? formatNumberSmart(Number(globalStakedForNextPeriod) / 1e8)
      : '0',
    [globalStakedForNextPeriod]
  );

  // Format current active period staking amounts (memoized to prevent flashing)
  const formattedGlobalActivePeriod = useMemo(() => 
    globalStakedForActivePeriod
      ? formatNumberSmart(Number(globalStakedForActivePeriod) / 1e8)
      : '0',
    [globalStakedForActivePeriod]
  );

  const formattedUserActivePeriod = useMemo(() =>
    userStakedForActivePeriod
      ? formatNumberSmart(Number(userStakedForActivePeriod) / 1e8)
      : '0',
    [userStakedForActivePeriod]
  );

  // Calculate APY for pending rewards (using period-specific amounts)
  const calculateRewardsAPY = () => {
    if (!userStakedForActivePeriod || !globalStakedForActivePeriod || !rewardBucketBalance) {
      return '0.00';
    }

    const userStakedNumber = Number(userStakedForActivePeriod) / 1e8;
    const pendingRewardsNumber = (Number(userStakedForActivePeriod) / Number(globalStakedForActivePeriod)) * (Number(rewardBucketBalance) / 1e8);
    
    if (userStakedNumber === 0 || pendingRewardsNumber === 0) {
      return '0.00';
    }

    // Use full stake length from constants (e.g., 369 days for TRIO)
    const stakeLengthDays = selectedPool.stakeLengthDays;
    
    // Calculate ROI and annualize it based on full stake length
    const roi = pendingRewardsNumber / userStakedNumber;
    const annualizedAPY = (roi * (365 / stakeLengthDays)) * 100;
    
    return annualizedAPY.toFixed(2);
  };

  const rewardsAPY = calculateRewardsAPY();

  const handleDHLock = async () => {
    // Validate amount
    const validation = validateAmount(lockAmount, {
      fieldName: 'Lock amount',
      maxBalance: (Number(userBalance || 0n) / 1e8).toString(),
      maxDecimals: 8
    });
    
    if (!validation.isValid) {
      onTransactionError?.(validation.error || 'Please enter a valid amount to lock');
      return;
    }

    const cleanAmount = removeCommas(lockAmount);

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
      setDhLockDialogOpen(false); // Close dialog to show success toast
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
    // Validate amount
    const validation = validateAmount(lockAmount, {
      fieldName: 'Approve amount',
      maxDecimals: 8
    });
    
    if (!validation.isValid) {
      onTransactionError?.(validation.error || 'Please enter a valid amount to approve');
      return;
    }

    const cleanAmount = removeCommas(lockAmount);

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
      <div className="flex justify-center gap-2 mb-0 text-[10px] xs:text-md md:text-lg">
        <TabButton
          active={activeTab === 'info'}
          onClick={() => setActiveTab('info')}
          label="Stake Info"
          borderColor={poolBorderColor}
        />
        <TabButton
          active={activeTab === 'end'}
          onClick={() => setActiveTab('end')}
          label={shouldShowStartStake ? "Start The Stake" : "End Stake"}
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
        className="bg-black/20 backdrop-blur-sm border-2 rounded-2xl p-6 md:p-8"
        style={{ borderColor: poolBorderColor }}
      >
        <div className="relative">
          <div 
            ref={infoScrollRef}
            className={`space-y-6 transition-all duration-200 max-h-[70vh] overflow-y-auto scrollbar-hide ${activeTab === 'info' ? 'opacity-100 visible' : 'opacity-0 invisible absolute inset-0'}`}
          >
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">Pool Information</h2>
            
            <InfoRow label="Pool Name" value={tokenName || 'Loading...'} />
            <InfoRow label="Pool Token" value={tokenSymbol ? formatTickerName(tokenSymbol) : 'Loading...'} />
            <InfoRow label="Your Balance" value={`${formattedBalance} ${tokenSymbol ? formatTickerName(tokenSymbol) : ''}`} />
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
                    if (!stakeEndDay) return 'Loading...';
                    // Calculate end date from contract's stakeEndDay (show at 23:59 UTC)
                    // HEX launch timestamp: December 3, 2019 at 00:00:00 UTC
                    const HEX_LAUNCH_TIMESTAMP = 1575331200000; // milliseconds
                    const MILLISECONDS_PER_DAY = 86400000;
                    // End of stakeEndDay at 23:59 UTC
                    const deadlineTimestamp = HEX_LAUNCH_TIMESTAMP + ((Number(stakeEndDay) + 1) * MILLISECONDS_PER_DAY) - 60000;
                    const deadline = new Date(deadlineTimestamp);
                    const day = deadline.getUTCDate();
                    const month = deadline.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
                    const year = deadline.getUTCFullYear();
                    return `${day} ${month} ${year}`;
                  })()}
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
            
            <a
              href={getBlockExplorerUrl(selectedPool.contractAddress)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 p-4 bg-blue-900/20 border-1 border-blue-500/30 rounded-xl block hover:bg-blue-900/30 transition-colors cursor-pointer"
            >
              <h3 className="text-lg font-semibold text-white mb-2">Contract Address</h3>
              <div className="flex items-center gap-2">
                <code className="text-sm text-gray-300 break-all">{selectedPool.contractAddress}</code>
                <ExternalLink className="w-4 h-4 text-blue-400" />
              </div>
            </a>
          </div>

          <div className={`space-y-6 transition-all duration-200 ${activeTab === 'end' ? 'opacity-100 visible' : 'opacity-0 invisible absolute inset-0'}`}>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">End HEX Stake</h2>
            
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
                      : <>
                          The stake has been ended.
                          {!isReloadPhaseOver && (
                            <>
                              {' '}The stake can be started again after the reload phase ends in:{' '}
                              <span className="font-mono">
                                {reloadPhaseTimeRemaining.days}d{' '}
                                {String(reloadPhaseTimeRemaining.hours).padStart(2, '0')}h{' '}
                                {String(reloadPhaseTimeRemaining.minutes).padStart(2, '0')}m{' '}
                                {String(reloadPhaseTimeRemaining.seconds).padStart(2, '0')}s
                              </span>
                            </>
                          )}
                        </>
                    }
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
                {/* Always show Mint Hedron button - ghosted if stake can't be ended or if there's no Hedron to claim */}
                <div className="space-y-2">
                  <button
                    onClick={handleMintHedron}
                    disabled={!canEndStake || claimableHedron === 0n || isMintingHedron || isEndingStake}
                    className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
                      canEndStake && claimableHedron > 0n && !isMintingHedron && !isEndingStake
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
                  {/* Only show claimable amount when stake can be ended and there's Hedron to claim */}
                  {canEndStake && claimableHedron > 0n && (
                    <p className="text-sm text-gray-400 text-center">
                      Claimable: {(Number(claimableHedron) / 1e9).toLocaleString(undefined, { maximumFractionDigits: 2 })} HDRN
                    </p>
                  )}
                </div>

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

          {/* Scroll indicator */}
          {showScrollIndicator && activeTab === 'info' && (
            <div className="absolute bottom-0 mb-[-10px] left-1/2 -translate-x-1/2 pointer-events-none z-10">
              <ChevronDown className="w-6 h-6 text-white/60" />
            </div>
          )}

          <div className={`space-y-6 transition-all duration-200 ${activeTab === 'claim' ? 'opacity-100 visible' : 'opacity-0 invisible absolute inset-0'}`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-white">Burn {formatTickerName(selectedPool.ticker)}. Claim HEX.</h2>
              
              {/* Diamond Hands Button - Show if pool has DH contract */}
              {DIAMOND_HANDS_CONTRACTS[selectedTicker] && (
                <Dialog open={dhUnlockDialogOpen} onOpenChange={setDhUnlockDialogOpen}>
                  <DialogTrigger asChild>
                    <button className="flex items-center justify-center p-2 text-gray-400 rounded-lg hover:text-gray-300">
                      <Gem className="w-5 h-5" />
                    </button>
                  </DialogTrigger>
                  <DialogContent className="bg-[#07111d] border-2 border-[#2D82F3]/30 max-h-[90vh] overflow-y-auto [&>button]:focus:ring-0 [&>button]:focus:ring-offset-0 [&>button]:focus:outline-none [&>button]:focus-visible:ring-0 rounded-xl">
                    <DialogHeader>
                      <DialogTitle className="text-2xl font-bold text-white flex items-center gap-2">
                        <Gem className="w-6 h-6 text-white" />
                        Unlock {formatTickerName(selectedPool.ticker)} from Diamond Hands
                      </DialogTitle>

                    </DialogHeader>
                    <div className="space-y-4 mt-2">
                      {/* User's Staked Balance */}
                      <div className="p-4 bg-blue-900/20 border border-blue-700/50 rounded-xl">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-300 text-sm">Your Locked Balance:</span>
                          <span className="text-2xl font-bold text-white">
                            {formattedDHBalance} {formatTickerName(selectedPool.ticker)}
                          </span>
                        </div>
                      </div>

                      {/* User's Stakes List with Radio Selection */}
                      {!isLoadingStakes && allPeriodCommitments.length > 0 && (
                        <div className="p-4 bg-blue-900/20 border border-blue-700/50 rounded-xl">
                          <div className="flex items-center justify-between mb-3">
                            <div className="text-md font-semibold text-blue-300">Select Stake to Manage</div>
                            <div className="text-xs text-slate-400">{allPeriodCommitments.length} stake{allPeriodCommitments.length !== 1 ? 's' : ''}</div>
                          </div>
                          
                          <div className="space-y-2 max-h-60 overflow-y-auto mb-3">
                            {allPeriodCommitments.map(({ period, stakeNumber, amount, status }) => {
                              const isSelected = selectedStakePeriod === period;
                              return (
                                <label 
                                  key={period} 
                                  className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                                    isSelected 
                                      ? 'bg-slate-800/50 border border-blue-500' 
                                      : 'bg-slate-800/30 border border-transparent hover:bg-slate-800/40'
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <input
                                      type="radio"
                                      name="selectedStake"
                                      checked={isSelected}
                                      onChange={() => setSelectedStakePeriod(period)}
                                      className="w-4 h-4 accent-blue-500 cursor-pointer"
                                    />
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm text-slate-300 font-medium">Stake {stakeNumber}</span>
                                      <span className={`text-xs px-2 py-0.5 rounded ${
                                        status === 'active' ? 'bg-green-500/20 text-green-300' :
                                        status === 'pending' ? 'bg-blue-500/20 text-blue-300' :
                                        'bg-gray-500/20 text-gray-400'
                                      }`}>
                                        {status === 'active' ? 'Active' : status === 'pending' ? 'Pre-committed' : 'Expired'}
                                      </span>
                            </div>
                            </div>
                                  <div className="text-sm font-semibold text-slate-200">{formatNumberSmart(parseFloat(amount))} {formatTickerName(selectedPool.ticker)}</div>
                                </label>
                              );
                            })}
                          </div>
                          
                          {/* User's Pending Rewards - Only show for ACTIVE stakes */}
                          {!isLoadingStakes && userStakedAmount && Number(userStakedAmount) > 0 && (() => {
                            const selectedStake = allPeriodCommitments.find(s => s.period === selectedStakePeriod);
                            return selectedStake?.status === 'active';
                          })() && (
                            <div className="p-3 bg-green-800/20 rounded-lg">
                            <div className="text-xs text-green-400 mb-1">Your Pending Rewards</div>
                            <div className="flex items-baseline gap-2">
                              <div className="text-lg font-semibold text-green-300">{pendingRewards}</div>
                              <div className="text-xs text-green-400">({rewardsAPY}% APY)</div>
                            </div>
                              <div className="text-xs text-green-500/70">{formatTickerName(selectedPool.ticker)}</div>
                          </div>
                          )}
                        </div>
                      )}


                      {/* Contract Stats & Stake History - Combined */}
                      {!isLoadingStakes && ((Number(globalStakedForActivePeriod) > 0 || Number(globalStakedForNextPeriod) > 0) || allHistoricalPeriods.length > 0) && (
                        <div className="p-4 bg-purple-900/30 border border-purple-700/30 rounded-xl space-y-4">
                          {/* Contract Stats */}
                          {(Number(globalStakedForActivePeriod) > 0 || Number(globalStakedForNextPeriod) > 0) && (
                            <div>
                              <div className="text-md font-semibold text-purple-300 mb-3">Contract Stats</div>
                              <div>
                                <div className="text-xs text-purple-400 mb-1">Total in DH Contract</div>
                                <div className="text-base font-semibold text-white">
                                  {formattedGlobalStaked} {formatTickerName(selectedPool.ticker)} <span className="text-xs text-purple-300/70">({supplyLockedPercentage}% of supply)</span>
                          </div>
                                </div>
                        </div>
                      )}

                          {/* Historical Stakes & Rewards Table */}
                          {allHistoricalPeriods.length > 0 && (
                            <div>
                              <div className="space-y-2">
                                <div className="grid grid-cols-5 gap-2 text-[10px] text-purple-400 font-semibold pb-2 border-b border-purple-700/30">
                                  <div className="text-center">Stake</div>
                                  <div className="text-center">Total Committed</div>
                                  <div className="text-center">Total Rewards</div>
                                  <div className="text-center">APY</div>
                                  <div className="text-center">Status</div>
                        </div>
                                {allHistoricalPeriods.map(({ period, stakeNumber, status, globalStaked, rewards }) => {
                                  // For active period, show live reward bucket balance
                                  const displayRewards = status === 'active' && rewardBucketBalance
                                    ? formatNumberSmart(Number(rewardBucketBalance) / 1e8)
                                    : rewards;
                                  
                                  // Calculate APY based on stake length
                                  const stakeLengthDays = selectedPool.stakeLengthDays;
                                  const committedNum = parseFloat(globalStaked.replace(/,/g, ''));
                                  const rewardsNum = parseFloat(displayRewards.replace(/,/g, ''));
                                  let apy = '0.00';
                                  
                                  if (committedNum > 0 && rewardsNum > 0 && stakeLengthDays > 0) {
                                    const rawAPY = (rewardsNum / committedNum) * (365 / stakeLengthDays) * 100;
                                    apy = rawAPY.toFixed(2);
                                  }
                                  
                                  return (
                                    <div 
                                      key={period} 
                                      className={`grid grid-cols-5 gap-2 text-[10px] py-1.5 px-2 rounded transition-colors ${
                                        selectedStakePeriod === period 
                                          ? 'bg-purple-800/30' 
                                          : 'hover:bg-purple-900/20'
                                      }`}
                                    >
                                      <div className="text-center text-white font-medium">Stake {stakeNumber}</div>
                                      <div className="text-center text-slate-300">{globalStaked}</div>
                                      <div className={`text-center font-semibold ${
                                        displayRewards !== '0.00' ? 'text-green-400' : 'text-gray-500'
                                      }`}>
                                        {displayRewards}
                        </div>
                                      <div className={`text-center font-semibold ${
                                        apy !== '0.00' ? 'text-yellow-400' : 'text-gray-500'
                                      }`}>
                                        {apy}%
                      </div>
                                      <div className="text-center">
                                        <span className={`text-[10px] ${
                                          status === 'active' ? 'text-purple-400' :
                                          status === 'pending' ? 'text-slate-400' :
                                          'text-gray-400'
                                        }`}>
                                          {status === 'active' ? 'Active' : status === 'pending' ? 'Pre-committed' : 'Expired'}
                                        </span>
                          </div>
                            </div>
                                  );
                                })}
                            </div>
                          </div>
                          )}
                        </div>
                      )}

                      {/* Withdrawal Section - Conditional Based on Selected Stake */}
                      {isLoadingStakes ? (
                        <div className="p-8 text-center">
                          <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" />
                          <p className="text-gray-400 mt-2 text-sm">Loading stakes...</p>
                        </div>
                      ) : selectedStakePeriod !== null && allPeriodCommitments.length > 0 ? (() => {
                        const selectedStake = allPeriodCommitments.find(s => s.period === selectedStakePeriod);
                        if (!selectedStake) return null;

                        const { status, amount, stakeNumber } = selectedStake;
                        const maxAmount = amount;

                        return (
                        <div className="space-y-3">
                            <h3 className="text-lg font-semibold text-white">
                              {status === 'expired' ? 'Withdraw from Stake ' + stakeNumber : 'Early Exit from Stake ' + stakeNumber}
                            </h3>
                          <div>
                            <input
                              ref={withdrawAmountRef}
                              type="text"
                              value={formatNumberWithCommas(getWithdrawAmount())}
                              onChange={(e) => handleAmountChange(e, setWithdrawAmount, withdrawAmountRef)}
                              placeholder="0.00"
                                className="w-full bg-black border border-white/20 rounded-lg p-3 text-white placeholder-gray-400 focus:outline-none focus:border-white"
                            />
                            
                            {/* Balance and MAX button */}
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-gray-400 text-xs">
                                  Available: {formatNumberSmart(parseFloat(maxAmount))} {formatTickerName(selectedPool.ticker)}
                              </span>
                              <button
                                type="button"
                                  onClick={() => setWithdrawAmount(maxAmount)}
                                  className="text-[#3D92FF] hover:text-[#5DA5FF] text-xs font-medium transition-colors"
                              >
                                MAX
                              </button>
                            </div>
                          </div>

                            {/* EXPIRED: Normal withdrawal + Claimable Rewards */}
                            {status === 'expired' && (
                            <>
                                {/* Withdraw Principal Button */}
                              <button
                                  onClick={handleDHWithdraw}
                                  disabled={!getWithdrawAmount() || parseFloat(removeCommas(getWithdrawAmount())) <= 0 || isDHLoading}
                                className={`w-full py-3 rounded-xl font-semibold text-lg transition-all ${
                                    getWithdrawAmount() && parseFloat(removeCommas(getWithdrawAmount())) > 0 && !isDHLoading
                                      ? 'bg-[#2D82F3] text-white hover:bg-[#3D92FF]'
                                      : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                  }`}
                                >
                                  {isDHLoading ? (
                                    <span className="flex items-center justify-center gap-2">
                                      <Loader2 className="w-5 h-5 animate-spin" />
                                      Processing...
                                    </span>
                                  ) : (
                                    'Withdraw Principal'
                                  )}
                                </button>

                                {/* Rewards Section - Show all tokens with available rewards */}
                                <div className="space-y-3">
                                  {tokenRewards.length > 0 ? (
                                    <>
                                      <div className="text-sm font-semibold text-white/90 mb-2">Available Reward Tokens:</div>
                                      {tokenRewards.map(({ token, claimableAmount, periodEndBalance, hasClaimed }) => {
                                        const isClaimingThisToken = isClaimingRewards[token] || false;
                                        const isPreparingThisToken = isPreparingClaims[token] || false;

                                        // Rewards not prepared yet
                                        if (parseFloat(periodEndBalance) === 0 && !hasClaimed) {
                                          return (
                                            <div key={token} className="p-4 bg-gradient-to-r from-yellow-900/30 to-amber-900/30 border border-yellow-600/40 rounded-xl">
                                              <div className="flex items-center justify-between">
                                                <div>
                                                  <div className="text-xs text-yellow-400 font-semibold mb-1">⏳ {token} Rewards Pending</div>
                                                  <div className="text-sm text-yellow-300/80">Claims need to be prepared first</div>
                                                  <div className="text-xs text-yellow-500/70 mt-1">Anyone can prepare by clicking →</div>
                                                </div>
                                                <button
                                                  onClick={() => handlePrepareClaim(token)}
                                                  disabled={isPreparingThisToken}
                                                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                                                    !isPreparingThisToken
                                                      ? 'bg-white hover:bg-gray-200 text-black'
                                                      : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                                  }`}
                                                >
                                                  {isPreparingThisToken ? (
                                                    <span className="flex items-center gap-2">
                                                      <Loader2 className="w-4 h-4 animate-spin" />
                                                      Preparing...
                                                    </span>
                                                  ) : (
                                                    'Prepare Claims'
                                                  )}
                                                </button>
                                              </div>
                                            </div>
                                          );
                                        }

                                        // Rewards prepared and claimable
                                        if (parseFloat(periodEndBalance) > 0 && parseFloat(claimableAmount) > 0 && !hasClaimed) {
                                          return (
                                            <div key={token} className="p-4 bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-600/40 rounded-xl">
                                              <div className="flex items-center justify-between">
                                                <div>
                                                  <div className="text-xs text-green-400 font-semibold mb-1">🎁 {token} Rewards</div>
                                                  <div className="text-2xl font-bold text-green-300">{claimableAmount} {token}</div>
                                                  <div className="text-xs text-green-500/70 mt-1">From penalties & airdrops</div>
                                                </div>
                                                <button
                                                  onClick={() => handleClaimRewards(token, claimableAmount)}
                                                  disabled={isClaimingThisToken}
                                                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                                                    !isClaimingThisToken
                                                      ? 'bg-green-600 hover:bg-green-700 text-white'
                                                      : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                                  }`}
                                                >
                                                  {isClaimingThisToken ? (
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
                                            <div key={token} className="p-3 bg-gray-800/50 border border-gray-600/30 rounded-xl">
                                              <p className="text-xs text-gray-400">
                                                ✅ {token} rewards already claimed for this stake.
                                              </p>
                                            </div>
                                          );
                                        }

                                        return null;
                                      })}
                                    </>
                                  ) : (
                                    <div className="p-3 bg-gray-800/50 border border-gray-600/30 rounded-xl">
                                      <p className="text-xs text-gray-400">
                                        💎 No rewards available for this stake (no early exits or airdrops during this period).
                                      </p>
                                    </div>
                                  )}
                                </div>

                                {/* Success Message */}
                                <div className="p-3 bg-white/5 border border-white/20 rounded-xl">
                                  <p className="text-xs text-gray-300">
                                    ✅ Stake has ended. You can withdraw your principal & claim rewards for this period without penalty.
                                  </p>
                                </div>
                              </>
                            )}

                            {/* ACTIVE: Early exit with penalty */}
                            {status === 'active' && (
                            <>
                              <button
                                onClick={handleDHWithdraw}
                                disabled={!getWithdrawAmount() || parseFloat(removeCommas(getWithdrawAmount())) <= 0 || isDHLoading}
                                className={`w-full py-3 rounded-xl font-semibold text-lg transition-all ${
                                  getWithdrawAmount() && parseFloat(removeCommas(getWithdrawAmount())) > 0 && !isDHLoading
                                    ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border-2 border-red-500/50'
                                    : 'bg-gray-700 text-gray-400 cursor-not-allowed border-2 border-gray-700/50'
                                }`}
                              >
                                {isDHLoading ? (
                                  <span className="flex items-center justify-center gap-2">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Processing...
                                  </span>
                                ) : (
                                    '⚠️ Early Exit (with Penalty)'
                                )}
                              </button>

                              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                                <p className="text-xs text-red-400 font-semibold">
                                    ⚠️ Stake is currently active. Exiting early will incur a 20% penalty.
                                </p>
                                <p className="text-xs text-red-300 mt-2">
                                  Time remaining: {timeRemaining.days > 0 && `${timeRemaining.days}d `}
                                  {String(timeRemaining.hours).padStart(2, '0')}h{' '}
                                  {String(timeRemaining.minutes).padStart(2, '0')}m{' '}
                                  {String(timeRemaining.seconds).padStart(2, '0')}s
                                </p>
                              </div>
                            </>
                            )}

                            {/* PENDING: Early exit with different warning */}
                            {status === 'pending' && (
                            <>
                              <button
                                onClick={handleDHWithdraw}
                                disabled={!getWithdrawAmount() || parseFloat(removeCommas(getWithdrawAmount())) <= 0 || isDHLoading}
                                className={`w-full py-3 rounded-xl font-semibold text-lg transition-all ${
                                  getWithdrawAmount() && parseFloat(removeCommas(getWithdrawAmount())) > 0 && !isDHLoading
                                      ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border-2 border-red-500/50'
                                      : 'bg-gray-700 text-gray-400 cursor-not-allowed border-2 border-gray-700/50'
                                }`}
                              >
                                {isDHLoading ? (
                                  <span className="flex items-center justify-center gap-2">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Processing...
                                  </span>
                                ) : (
                                    '⚠️ Early Exit (with Penalty)'
                                )}
                              </button>

                                <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                                  <p className="text-xs text-yellow-400 font-semibold">
                                    ⚠️ This stake is pre-committed for a future period. Exiting early will incur a 20% penalty.
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                        );
                      })() : (
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
                    Balance: {formattedBalance} {tokenSymbol ? formatTickerName(tokenSymbol) : ''}
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

              {!stakeIsActive && reloadPhaseEnd && currentHexDay && currentHexDay <= (reloadPhaseEnd + 1n) && (
                <div className="p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-xl">
                  <p className="text-sm text-yellow-400">Reload phase ends in:</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {reloadPhaseTimeRemaining.days}d {reloadPhaseTimeRemaining.hours}h {reloadPhaseTimeRemaining.minutes}m {reloadPhaseTimeRemaining.seconds}s
                  </p>
                </div>
              )}

              <button
                onClick={handleRedeem}
                disabled={!redeemAmount || parseFloat(removeCommas(redeemAmount)) <= 0 || isLoading || stakeIsActive || !stakeEndDay || !userBalance || userBalance === 0n}
                className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
                  redeemAmount && parseFloat(removeCommas(redeemAmount)) > 0 && !isLoading && !stakeIsActive && stakeEndDay && userBalance && userBalance > 0n
                    ? 'bg-white text-black hover:bg-gray-200'
                    : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                } ${!userBalance || userBalance === 0n ? 'opacity-50' : ''}`}
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

          <div className={`space-y-6 transition-all duration-200 ${activeTab === 'mint' ? 'opacity-100 visible' : 'opacity-0 invisible absolute inset-0'}`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-white">Pledge HEX. Mint {formatTickerName(selectedPool.ticker)}.</h2>
              
              {/* Diamond Hands Button - Only show if pool has a DH contract */}
              {DIAMOND_HANDS_CONTRACTS[selectedTicker] && (
                <Dialog open={dhLockDialogOpen} onOpenChange={setDhLockDialogOpen}>
                  <DialogTrigger asChild>
                    <button className="flex items-center justify-center p-2 text-gray-400 hover:text-gray-300">
                      <Gem className="w-5 h-5" />
                    </button>
                  </DialogTrigger>
                  <DialogContent className="bg-[#07111d] border-2 border-[#2D82F3]/30 rounded-xl max-h-[90vh] overflow-y-auto [&>button]:focus:ring-0 [&>button]:focus:ring-offset-0 [&>button]:focus:outline-none [&>button]:focus-visible:ring-0">
                    <DialogHeader>
                      <DialogTitle className="text-2xl font-bold text-white flex items-center gap-2">
                        <Gem className="w-6 h-6 text-white" />
                        Lock {formatTickerName(selectedPool.ticker)} in Diamond Hands
                      </DialogTitle>

                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      {/* Lock Section */}
                      {/* TESTING: Disabled stake checks to allow locking anytime */}
                      {false && stakeIsActive ? (
                        <div className="space-y-3">
                          <div className="p-4 bg-gray-900/50 border border-gray-700/50 rounded-xl text-center">
                            <p className="text-gray-400 mb-2">🔒 Locking Disabled</p>
                            <p className="text-gray-500 text-sm">You cannot lock tokens during a stake on this front-end. You'll have to wait until the stake ends to lock tokens for the next period.</p>
                          </div>
                        </div>
                      ) : false && !isMintingPhaseActive ? (
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
                              className="w-full bg-black border border-[#2D82F3]/50 rounded-lg p-3 text-white placeholder-gray-400 focus:outline-none focus:border-[#3D92FF]"
                            />
                            
                            {/* Balance and MAX button */}
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-gray-400 text-xs">
                                Balance: {formattedBalance} {formatTickerName(selectedPool.ticker)}
                              </span>
                              <button
                                type="button"
                                onClick={() => setLockAmount(getFullPrecisionBalance())}
                                className="text-[#3D92FF] hover:text-[#5DA5FF] text-xs font-medium transition-colors"
                              >
                                MAX
                              </button>
                          </div>
                        </div>

                          {/* Check if approval is needed */}
                          {(() => {
                            const hasValidAmount = lockAmount && parseFloat(removeCommas(lockAmount)) > 0;
                            let needsApproval = false;
                            
                            if (hasValidAmount) {
                            const cleanAmount = removeCommas(lockAmount);
                            const [whole, decimal = ''] = cleanAmount.split('.');
                            const paddedDecimal = decimal.padEnd(8, '0').slice(0, 8);
                            const amountInMini = BigInt(whole + paddedDecimal);
                              needsApproval = !dhAllowance || dhAllowance < amountInMini;
                            }

                            return needsApproval ? (
                              <button
                                onClick={handleDHApprove}
                                disabled={isDHLoading || !hasValidAmount}
                                className={`w-full py-3 rounded-xl font-semibold text-lg transition-all ${
                                  !isDHLoading && hasValidAmount
                                    ? 'bg-white text-black hover:bg-gray-100'
                                    : 'bg-white text-black cursor-not-allowed opacity-50'
                                }`}
                              >
                                {isDHLoading ? (
                                  <span className="flex items-center justify-center gap-2">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Processing...
                                  </span>
                                ) : (
                                  `Approve ${formatTickerName(selectedPool.ticker)}`
                                )}
                              </button>
                            ) : (
                              <button
                                onClick={handleDHLock}
                                disabled={isDHLoading || !hasValidAmount}
                                className={`w-full py-3 rounded-xl font-semibold text-lg transition-all ${
                                  !isDHLoading && hasValidAmount
                                    ? 'bg-white text-black hover:bg-gray-200'
                                    : 'bg-white text-black cursor-not-allowed opacity-50'
                                }`}
                              >
                                {isDHLoading ? (
                                  <span className="flex items-center justify-center gap-2">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Processing...
                                  </span>
                                ) : (
                                  <span className="flex items-center justify-center gap-2">
                                    <Lock className="w-5 h-5" />
                                    Lock {formatTickerName(selectedPool.ticker)}
                                  </span>
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
                    {calculateMintableTokens(mintAmount)} {tokenSymbol ? formatTickerName(tokenSymbol) : ''}
                  </p>
                </div>
              )}

              {!stakeIsActive && reloadPhaseEnd && currentHexDay && currentHexDay <= (reloadPhaseEnd + 1n) && (
                <div className="p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-xl">
                  <p className="text-sm text-yellow-400">Reload phase ends in:</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {reloadPhaseTimeRemaining.days}d {reloadPhaseTimeRemaining.hours}h {reloadPhaseTimeRemaining.minutes}m {reloadPhaseTimeRemaining.seconds}s
                  </p>
                </div>
              )}

              {/* Check if approval is needed */}
              {(() => {
                const hasAmount = mintAmount && parseFloat(removeCommas(mintAmount)) > 0;
                
                if (!hasAmount) {
                  // Show disabled button when no amount entered
                  return (
                    <button
                      disabled
                      className="w-full py-4 rounded-xl font-semibold text-lg bg-gray-700 text-gray-400 cursor-not-allowed"
                    >
                      Mint {tokenSymbol ? formatTickerName(tokenSymbol) : ''}
                    </button>
                  );
                }

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
                        ? 'bg-white text-black hover:bg-gray-100'
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
                      `Mint ${tokenSymbol ? formatTickerName(tokenSymbol) : ''}`
                    )}
                  </button>
                );
              })()}

              {!isMintingPhaseActive && (
                <div className="text-sm text-yellow-400 text-center space-y-2">
                  <div className="flex items-start justify-center gap-2 leading-5">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span className="leading-5">
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

      {/* Early Withdraw Confirmation Dialog */}
      <Dialog open={showEarlyWithdrawDialog} onOpenChange={setShowEarlyWithdrawDialog}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-[10000] bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-[10001] grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 border-2 border-red-500/50 bg-black p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-lg">
            <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none disabled:pointer-events-none">
              <Cross2Icon className="h-4 w-4 text-white" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400 text-2xl">
              <AlertTriangle className="w-6 h-6" />
              EARLY WITHDRAWAL WARNING
            </DialogTitle>
            <DialogDescription className="text-gray-300">
              You are about to unlock tokens from Diamond Hands while the stake is still active. This will incur a penalty.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Unlock Amount:</span>
                <span className="text-white font-semibold">{formatNumberWithCommas(earlyWithdrawDetails.amount)} {formatTickerName(selectedPool.ticker)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-red-400">Penalty:</span>
                <span className="text-red-400 font-semibold">
                  -{formatNumberWithCommas(earlyWithdrawDetails.penalty)} {formatTickerName(selectedPool.ticker)} <span className="text-xs text-red-400/80">({earlyWithdrawDetails.penaltyPercentage}%)</span>
                </span>
              </div>
              <div className="border-t border-red-500/30 pt-3 flex justify-between">
                <span className="text-white font-semibold">You Will Receive:</span>
                <span className="text-white font-bold text-lg">{formatNumberWithCommas(earlyWithdrawDetails.afterPenalty)} {formatTickerName(selectedPool.ticker)}</span>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              onClick={() => setShowEarlyWithdrawDialog(false)}
              className="bg-blue-600 hover:bg-blue-700 text-white border-0"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmEarlyDHWithdraw}
              className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border-2 border-red-500/50"
            >
              Confirm Withdrawal
            </Button>
          </DialogFooter>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </Dialog>
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


