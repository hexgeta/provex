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
  'function earlyEndStakeToken(uint256 stakeID, uint256 amount)',
  'function endCompletedStake(uint256 stakeID, uint256 amount)',
  'function calculatePenalty(uint256 amount) view returns (uint256)',
  'function stakes(address, uint256) view returns (address staker, uint256 balance, uint256 stakeID, uint256 stake_expiry_period, bool initiated)',
  'function joinClub(uint256 amount)',
  'function getNextStakingPeriod() view returns (uint256)',
]);

// Pool token ABI for approval and balance
const POOL_TOKEN_ABI = parseAbi([
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function totalSupply() view returns (uint256)',
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
      console.error('Error fetching stake info:', error);
      return null;
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
      console.error('Error calculating penalty:', error);
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
