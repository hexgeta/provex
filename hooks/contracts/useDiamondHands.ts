import { useAccount, usePublicClient, useWalletClient, useContractRead } from 'wagmi';
import { Address, parseAbi } from 'viem';
import { useState } from 'react';

// ABI for the Diamond Hands contract
const DIAMOND_HANDS_ABI = parseAbi([
  'function USER_AMOUNT_STAKED(address) view returns (uint256)',
  'function GLOBAL_AMOUNT_STAKED() view returns (uint256)',
  'function PERPETUAL_POOL_ADDRESS() view returns (address)',
  'function REWARD_BUCKET_ADDRESS() view returns (address)',
  'function STAKE_REWARD_DISTRIBUTION_ADDRESS() view returns (address)',
  'function getCurrentPeriod() view returns (uint256)',
  'function getglobalStakedTokensPerPeriod(uint256 period) view returns (uint256)',
  'function getAddressPeriodEndTotal(address staker, uint256 period, uint256 stakeID) view returns (uint256)',
  'function earlyEndStakeToken(uint256 stakeID, uint256 amount)',
  'function endCompletedStake(uint256 stakeID, uint256 amount)',
  'function calculatePenalty(uint256 amount) view returns (uint256)',
  'function stakes(address, uint256) view returns (address staker, uint256 balance, uint256 stakeID, uint256 stake_expiry_period, bool initiated)',
  'function joinClub(uint256 amount)',
  'function getNextStakingPeriod() view returns (uint256)',
  'function isStakingPeriod() view returns (bool)',
]);

// Pool token ABI for approval and balance
const POOL_TOKEN_ABI = parseAbi([
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function STAKE_LENGTH() view returns (uint256)',
]);


export function useDiamondHands(contractAddress: Address, poolTokenAddress?: Address) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const [isLoading, setIsLoading] = useState(false);

  // Get user's total staked amount
  const { data: userStakedAmount, refetch: refetchStakedAmount } = useContractRead({
    address: contractAddress,
    abi: DIAMOND_HANDS_ABI,
    functionName: 'USER_AMOUNT_STAKED',
    args: address ? [address] : undefined,
    enabled: !!address && !!contractAddress,
  });

  // Get global total staked amount
  const { data: globalStakedAmount, refetch: refetchGlobalStakedAmount } = useContractRead({
    address: contractAddress,
    abi: DIAMOND_HANDS_ABI,
    functionName: 'GLOBAL_AMOUNT_STAKED',
    enabled: !!contractAddress,
  });

  // Get current period
  const { data: currentPeriod } = useContractRead({
    address: contractAddress,
    abi: DIAMOND_HANDS_ABI,
    functionName: 'getCurrentPeriod',
    enabled: !!contractAddress,
  });

  // Get reward bucket address
  const { data: rewardBucketAddress } = useContractRead({
    address: contractAddress,
    abi: DIAMOND_HANDS_ABI,
    functionName: 'REWARD_BUCKET_ADDRESS',
    enabled: !!contractAddress,
  });

  // Get stake reward distribution address
  const { data: stakeRewardDistributionAddress } = useContractRead({
    address: contractAddress,
    abi: DIAMOND_HANDS_ABI,
    functionName: 'STAKE_REWARD_DISTRIBUTION_ADDRESS',
    enabled: !!contractAddress,
  });

  // Get reward bucket balance (pool tokens in reward bucket)
  const { data: rewardBucketBalance, refetch: refetchRewardBucketBalance } = useContractRead({
    address: poolTokenAddress,
    abi: POOL_TOKEN_ABI,
    functionName: 'balanceOf',
    args: rewardBucketAddress ? [rewardBucketAddress] : undefined,
    enabled: !!poolTokenAddress && !!rewardBucketAddress,
  });

  // Get pool token total supply
  const { data: poolTokenTotalSupply } = useContractRead({
    address: poolTokenAddress,
    abi: POOL_TOKEN_ABI,
    functionName: 'totalSupply',
    enabled: !!poolTokenAddress,
  });

  // Get pool token allowance for Diamond Hands contract
  const { data: dhAllowance, refetch: refetchAllowance } = useContractRead({
    address: poolTokenAddress,
    abi: POOL_TOKEN_ABI,
    functionName: 'allowance',
    args: address && contractAddress ? [address, contractAddress] : undefined,
    enabled: !!address && !!poolTokenAddress && !!contractAddress,
  });

  // Get stake info for a specific stake ID
  const getStakeInfo = async (stakeID: bigint) => {
    if (!publicClient || !address) return null;
    
    try {
      const stakeInfo = await publicClient.readContract({
        address: contractAddress,
        abi: DIAMOND_HANDS_ABI,
        functionName: 'stakes',
        args: [address, stakeID],
      });
      return stakeInfo;
    } catch (error) {
      return null;
    }
  };

  // Get the active staking period (for reward calculations)
  const getActiveStakingPeriod = async () => {
    if (!publicClient || !currentPeriod) return null;

    try {
      const isStaking = await publicClient.readContract({
        address: contractAddress,
        abi: DIAMOND_HANDS_ABI,
        functionName: 'isStakingPeriod',
      });

      // If we're in a staking period, that's the active one
      // If we're in reload, the last period (current - 1) was the staking period
      const activePeriod = isStaking ? currentPeriod : (currentPeriod as bigint) - 1n;
      return activePeriod;
    } catch (error) {
      return null;
    }
  };

  // Get all user's stake records (for debugging)
  const getAllUserStakes = async () => {
    if (!publicClient || !address || !currentPeriod) return [];

    try {
      const stakes: Array<{
        stakeID: bigint;
        balance: bigint;
        expiry: bigint;
        initiated: boolean;
      }> = [];

      // Loop through all possible stakeIDs
      const maxStakeID = (currentPeriod as bigint) + 10n;
      
      for (let stakeID = 0n; stakeID <= maxStakeID; stakeID++) {
        try {
          const stake = await publicClient.readContract({
            address: contractAddress,
            abi: DIAMOND_HANDS_ABI,
            functionName: 'stakes',
            args: [address, stakeID],
          }) as any;

          // Contract returns array: [staker, balance, stakeID, expiry, initiated]
          const initiated = stake[4];
          const balance = stake[1];
          const expiry = stake[3];

          if (initiated && balance > 0n) {
            stakes.push({
              stakeID,
              balance: balance,
              expiry: expiry,
              initiated: initiated,
            });
          }
        } catch (error) {
          continue;
        }
      }
      
      return stakes;
    } catch (error) {
      return [];
    }
  };

  // Get user's total staked amount for a specific period (across all their stakes)
  const getUserStakedForPeriod = async (period: bigint) => {
    if (!publicClient || !address || !currentPeriod) return 0n;

    try {
      let total = 0n;

      // Loop through all possible stakeIDs (0 to current period + 10 to catch edge cases)
      const maxStakeID = (currentPeriod as bigint) + 10n;
      
      for (let stakeID = 0n; stakeID <= maxStakeID; stakeID++) {
        try {
          // Check if this stake exists
          const stake = await publicClient.readContract({
            address: contractAddress,
            abi: DIAMOND_HANDS_ABI,
            functionName: 'stakes',
            args: [address, stakeID],
          }) as any;

          // Contract returns array: [staker, balance, stakeID, expiry, initiated]
          const initiated = stake[4];

          // If stake exists (initiated == true), get the amount for this period
          if (initiated) {
            const amount = await publicClient.readContract({
              address: contractAddress,
              abi: DIAMOND_HANDS_ABI,
              functionName: 'getAddressPeriodEndTotal',
              args: [address, period, stakeID],
            }) as bigint;

            total += amount;
          }
        } catch (error) {
          continue;
        }
      }

      return total;
    } catch (error) {
      return 0n;
    }
  };

  // Get global staked amount for a specific period
  const getGlobalStakedForPeriod = async (period: bigint) => {
    if (!publicClient) return 0n;

    try {
      const amount = await publicClient.readContract({
        address: contractAddress,
        abi: DIAMOND_HANDS_ABI,
        functionName: 'getglobalStakedTokensPerPeriod',
        args: [period],
      });
      return amount as bigint;
    } catch (error) {
      return 0n;
    }
  };

  // Calculate penalty for early withdrawal
  const calculatePenalty = async (amount: bigint) => {
    if (!publicClient) return 0n;
    
    try {
      const penalty = await publicClient.readContract({
        address: contractAddress,
        abi: DIAMOND_HANDS_ABI,
        functionName: 'calculatePenalty',
        args: [amount],
      });
      return penalty as bigint;
    } catch (error) {
      return 0n;
    }
  };

  // Withdraw from completed stake (no penalty)
  const withdrawCompleted = async (stakeID: bigint, amount: bigint) => {
    if (!walletClient || !address) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    try {
      const { request } = await publicClient!.simulateContract({
        address: contractAddress,
        abi: DIAMOND_HANDS_ABI,
        functionName: 'endCompletedStake',
        args: [stakeID, amount],
        account: address,
      });

      const hash = await walletClient.writeContract(request);
      const receipt = await publicClient!.waitForTransactionReceipt({ hash });
      
      await refetchStakedAmount();
      
      return { hash, receipt };
    } catch (error: any) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Early withdraw (with penalty)
  const withdrawEarly = async (stakeID: bigint, amount: bigint) => {
    if (!walletClient || !address) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    try {
      const { request } = await publicClient!.simulateContract({
        address: contractAddress,
        abi: DIAMOND_HANDS_ABI,
        functionName: 'earlyEndStakeToken',
        args: [stakeID, amount],
        account: address,
      });

      const hash = await walletClient.writeContract(request);
      const receipt = await publicClient!.waitForTransactionReceipt({ hash });
      
      await refetchStakedAmount();
      
      return { hash, receipt };
    } catch (error: any) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Approve pool tokens for Diamond Hands contract
  const approvePoolToken = async (amount: bigint) => {
    if (!walletClient || !address || !poolTokenAddress) {
      throw new Error('Wallet not connected or pool token address not provided');
    }

    setIsLoading(true);
    try {
      const { request } = await publicClient!.simulateContract({
        address: poolTokenAddress,
        abi: POOL_TOKEN_ABI,
        functionName: 'approve',
        args: [contractAddress, amount],
        account: address,
      });

      const hash = await walletClient.writeContract(request);
      const receipt = await publicClient!.waitForTransactionReceipt({ hash });
      
      await refetchAllowance();
      
      return { hash, receipt };
    } catch (error: any) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Lock tokens (joinClub)
  const lockTokens = async (amount: bigint) => {
    if (!walletClient || !address) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    try {
      const { request } = await publicClient!.simulateContract({
        address: contractAddress,
        abi: DIAMOND_HANDS_ABI,
        functionName: 'joinClub',
        args: [amount],
        account: address,
      });

      const hash = await walletClient.writeContract(request);
      const receipt = await publicClient!.waitForTransactionReceipt({ hash });
      
      await refetchStakedAmount();
      
      return { hash, receipt };
    } catch (error: any) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Get user's historical staked amounts for past periods
  const getHistoricalPeriods = async (numPeriods: number = 10) => {
    if (!publicClient || !address || !currentPeriod) return [];

    try {
      const current = currentPeriod as bigint;
      const historical: Array<{
        period: bigint;
        amount: bigint;
      }> = [];

      // Get data for completed periods (current period - numPeriods to current period - 1)
      for (let i = 1; i <= numPeriods; i++) {
        const period = current - BigInt(i);
        if (period < 0n) break; // Don't go before period 0

        const amount = await getUserStakedForPeriod(period);
        
        // Only add if there was an amount staked
        if (amount > 0n) {
          historical.push({
            period,
            amount,
          });
        }
      }

      return historical;
    } catch (error) {
      return [];
    }
  };

  return {
    userStakedAmount,
    globalStakedAmount,
    poolTokenTotalSupply,
    currentPeriod,
    rewardBucketAddress,
    rewardBucketBalance,
    stakeRewardDistributionAddress,
    dhAllowance,
    isLoading,
    getStakeInfo,
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
    refetchStakedAmount,
    refetchGlobalStakedAmount,
    refetchRewardBucketBalance,
  };
}
