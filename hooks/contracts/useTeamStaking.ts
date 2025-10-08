import { useAccount, usePublicClient, useWalletClient, useContractRead } from 'wagmi';
import { Address, parseAbi, formatUnits, parseUnits } from 'viem';
import { useState, useEffect } from 'react';
import { TEAM_CONTRACT_ADDRESS, RewardToken } from '@/constants/team';

// TEAM Contract ABI
const TEAM_ABI = parseAbi([
  // Read functions
  'function getCurrentPeriod() view returns (uint256)',
  'function isStakingPeriod() view returns (bool)',
  'function MINTING_PHASE_START() view returns (uint256)',
  'function MINTING_PHASE_END() view returns (uint256)',
  'function IS_MINTING_ONGOING() view returns (bool)',
  'function GLOBAL_AMOUNT_STAKED() view returns (uint256)',
  'function USER_AMOUNT_STAKED(address) view returns (uint256)',
  'function globalStakedTeamPerPeriod(uint256) view returns (uint256)',
  'function getAddressPeriodEndTotal(address, uint256, uint256) view returns (uint256)',
  'function getPeriodRedemptionRates(string, uint256) view returns (uint256)',
  'function getClaimableAmount(address, uint256, string, uint256) view returns (uint256, address)',
  'function periodRedemptionRates(string, uint256) view returns (uint256)',
  'function ESCROW_ADDRESS() view returns (address)',
  'function MYSTERY_BOX_ADDRESS() view returns (address)',
  'function STAKE_REWARD_DISTRIBUTION_ADDRESS() view returns (address)',
  'function poolAddresses(string) view returns (address)',
  'function getPoolAddresses(string) view returns (address)',
  'function getSupportedTokens(string) view returns (address)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address, address) view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function stakes(address, uint256) view returns (address staker, uint256 balance, uint256 stakeID, uint256 stake_expiry_period, bool initiated)',
  
  // Write functions
  'function stakeTeam(uint256 amount)',
  'function earlyEndStakeTeam(uint256 stakeID, uint256 amount)',
  'function endCompletedStake(uint256 stakeID, uint256 amount)',
  'function extendStake(uint256 stakeID)',
  'function restakeExpiredStake(uint256 stakeID)',
  'function prepareClaim(string ticker)',
  'function approve(address spender, uint256 amount) returns (bool)',
]);

// Stake Reward Distribution ABI
const STAKE_REWARD_DISTRIBUTION_ABI = parseAbi([
  'function claimRewards(uint256 period, string ticker, uint256 stakeID)',
  'function didUserStakeClaimFromPeriod(address, uint256, uint256, string) view returns (bool)',
]);

export function useTeamStaking() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const [isLoading, setIsLoading] = useState(false);

  // Read current period
  const { data: currentPeriod, refetch: refetchPeriod } = useContractRead({
    address: TEAM_CONTRACT_ADDRESS,
    abi: TEAM_ABI,
    functionName: 'getCurrentPeriod',
  });

  // Check if it's a staking period
  const { data: isStakingPeriod } = useContractRead({
    address: TEAM_CONTRACT_ADDRESS,
    abi: TEAM_ABI,
    functionName: 'isStakingPeriod',
  });

  // Get user's staked amount
  const { data: userStaked, refetch: refetchUserStaked } = useContractRead({
    address: TEAM_CONTRACT_ADDRESS,
    abi: TEAM_ABI,
    functionName: 'USER_AMOUNT_STAKED',
    args: address ? [address] : undefined,
    enabled: !!address,
  });

  // Get user's TEAM balance
  const { data: teamBalance, refetch: refetchBalance } = useContractRead({
    address: TEAM_CONTRACT_ADDRESS,
    abi: TEAM_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    enabled: !!address,
  });

  // Get global staked amount
  const { data: globalStaked } = useContractRead({
    address: TEAM_CONTRACT_ADDRESS,
    abi: TEAM_ABI,
    functionName: 'GLOBAL_AMOUNT_STAKED',
  });

  // Get stake reward distribution address
  const { data: stakeRewardDistributionAddress } = useContractRead({
    address: TEAM_CONTRACT_ADDRESS,
    abi: TEAM_ABI,
    functionName: 'STAKE_REWARD_DISTRIBUTION_ADDRESS',
  });

  // Helper function to add commas to numbers
  const formatWithCommas = (value: string): string => {
    const parts = value.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  };

  // Format values with 2 decimal places for display
  const formattedTeamBalance = teamBalance ? formatWithCommas(parseFloat(formatUnits(teamBalance, 8)).toFixed(2)) : '0.00';
  const formattedUserStaked = userStaked ? formatWithCommas(parseFloat(formatUnits(userStaked, 8)).toFixed(2)) : '0.00';
  const formattedGlobalStaked = globalStaked ? formatWithCommas(parseFloat(formatUnits(globalStaked, 8)).toFixed(2)) : '0.00';
  
  // Full precision values for MAX button (without rounding)
  const fullPrecisionTeamBalance = teamBalance ? formatUnits(teamBalance, 8) : '0';
  const fullPrecisionUserStaked = userStaked ? formatUnits(userStaked, 8) : '0';

  // Check if prepareClaim has been called for a token/period
  const checkPrepareClaimStatus = async (ticker: string, period: bigint) => {
    if (!publicClient) return false;
    try {
      const rate = await publicClient.readContract({
        address: TEAM_CONTRACT_ADDRESS,
        abi: TEAM_ABI,
        functionName: 'getPeriodRedemptionRates',
        args: [ticker, period],
      });
      return rate && rate > 0n;
    } catch (error) {
      console.error('Error checking prepare claim status:', error);
      return false;
    }
  };

  // Get claimable amount for user
  const getClaimableAmount = async (
    period: bigint,
    ticker: string,
    stakeID: bigint
  ) => {
    if (!publicClient || !address) return { amount: 0n, tokenAddress: '0x0' as Address };
    
    try {
      const result = await publicClient.readContract({
        address: TEAM_CONTRACT_ADDRESS,
        abi: TEAM_ABI,
        functionName: 'getClaimableAmount',
        args: [address, period, ticker, stakeID],
      }) as [bigint, Address];
      
      return { amount: result[0], tokenAddress: result[1] };
    } catch (error) {
      console.error('Error getting claimable amount:', error);
      return { amount: 0n, tokenAddress: '0x0' as Address };
    }
  };

  // Check if user has already claimed
  const checkHasClaimed = async (
    period: bigint,
    ticker: string,
    stakeID: bigint
  ) => {
    if (!publicClient || !address || !stakeRewardDistributionAddress) return false;
    
    try {
      const hasClaimed = await publicClient.readContract({
        address: stakeRewardDistributionAddress,
        abi: STAKE_REWARD_DISTRIBUTION_ABI,
        functionName: 'didUserStakeClaimFromPeriod',
        args: [address, stakeID, period, ticker],
      });
      return hasClaimed;
    } catch (error) {
      console.error('Error checking claim status:', error);
      return false;
    }
  };

  // Get user's current withdrawable balance for a specific stakeID
  const getUserStakedForPeriod = async (stakeID: bigint) => {
    if (!publicClient || !address) return 0n;
    
    try {
      const stakeData = await publicClient.readContract({
        address: TEAM_CONTRACT_ADDRESS,
        abi: TEAM_ABI,
        functionName: 'stakes',
        args: [address, stakeID],
      }) as [string, bigint, bigint, bigint, boolean];
      
      // stakes returns: [staker, balance, stakeID, stake_expiry_period, initiated]
      // We want index 1: balance (current withdrawable amount)
      return stakeData[1];
    } catch (error) {
      console.error('Error getting user staked for period:', error);
      return 0n;
    }
  };

  // Get all user's stakes across periods
  const getAllUserStakes = async () => {
    if (!publicClient || !address || !currentPeriod) return [];

    try {
      const stakes: Array<{
        stakeID: bigint;
        period: bigint;
        balance: bigint;
        originalBalance: bigint;
      }> = [];

      // Loop through all possible stakeIDs up to current period + buffer
      // For TEAM staking, stakeID corresponds to the period number (odd numbers only)
      const maxPeriod = (currentPeriod as bigint) + 10n;
      
      for (let stakeID = 1n; stakeID <= maxPeriod; stakeID += 2n) {
        // Only check odd periods (1, 3, 5, 7, etc.) since those are staking periods
        try {
          const balance = await getUserStakedForPeriod(stakeID);
          
          if (balance > 0n) {
            // Get original staked amount for this period
            const originalAmount = await publicClient.readContract({
              address: TEAM_CONTRACT_ADDRESS,
              abi: TEAM_ABI,
              functionName: 'getAddressPeriodEndTotal',
              args: [address, stakeID, stakeID],
            }) as bigint;
            
            stakes.push({
              stakeID: stakeID,
              period: stakeID, // For TEAM, stakeID = period
              balance: balance, // Current withdrawable balance
              originalBalance: originalAmount, // Original amount staked
            });
          }
        } catch (error) {
          // Skip stakeIDs with errors
          continue;
        }
      }

      return stakes;
    } catch (error) {
      console.error('Error fetching all user stakes:', error);
      return [];
    }
  };

  // Stake TEAM
  const stakeTeam = async (amount: bigint) => {
    if (!walletClient || !address) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    try {
      const { request } = await publicClient!.simulateContract({
        address: TEAM_CONTRACT_ADDRESS,
        abi: TEAM_ABI,
        functionName: 'stakeTeam',
        args: [amount],
        account: address,
      });

      const hash = await walletClient.writeContract(request);
      const receipt = await publicClient!.waitForTransactionReceipt({ hash });
      
      await refetchUserStaked();
      await refetchBalance();
      await refetchPeriod();
      
      return { hash, receipt };
    } catch (error: any) {
      console.error('Error staking TEAM:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Early end stake
  const earlyEndStake = async (stakeID: bigint, amount: bigint) => {
    if (!walletClient || !address) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    try {
      const { request } = await publicClient!.simulateContract({
        address: TEAM_CONTRACT_ADDRESS,
        abi: TEAM_ABI,
        functionName: 'earlyEndStakeTeam',
        args: [stakeID, amount],
        account: address,
      });

      const hash = await walletClient.writeContract(request);
      const receipt = await publicClient!.waitForTransactionReceipt({ hash });
      
      await refetchUserStaked();
      await refetchBalance();
      
      return { hash, receipt };
    } catch (error: any) {
      console.error('Error early ending stake:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // End completed stake
  const endCompletedStake = async (stakeID: bigint, amount: bigint) => {
    if (!walletClient || !address) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    try {
      const { request } = await publicClient!.simulateContract({
        address: TEAM_CONTRACT_ADDRESS,
        abi: TEAM_ABI,
        functionName: 'endCompletedStake',
        args: [stakeID, amount],
        account: address,
      });

      const hash = await walletClient.writeContract(request);
      const receipt = await publicClient!.waitForTransactionReceipt({ hash });
      
      await refetchUserStaked();
      await refetchBalance();
      
      return { hash, receipt };
    } catch (error: any) {
      console.error('Error ending completed stake:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Extend stake
  const extendStake = async (stakeID: bigint) => {
    if (!walletClient || !address) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    try {
      const { request } = await publicClient!.simulateContract({
        address: TEAM_CONTRACT_ADDRESS,
        abi: TEAM_ABI,
        functionName: 'extendStake',
        args: [stakeID],
        account: address,
      });

      const hash = await walletClient.writeContract(request);
      const receipt = await publicClient!.waitForTransactionReceipt({ hash });
      
      return { hash, receipt };
    } catch (error: any) {
      console.error('Error extending stake:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Restake expired stake
  const restakeExpiredStake = async (stakeID: bigint) => {
    if (!walletClient || !address) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    try {
      const { request } = await publicClient!.simulateContract({
        address: TEAM_CONTRACT_ADDRESS,
        abi: TEAM_ABI,
        functionName: 'restakeExpiredStake',
        args: [stakeID],
        account: address,
      });

      const hash = await walletClient.writeContract(request);
      const receipt = await publicClient!.waitForTransactionReceipt({ hash });
      
      await refetchUserStaked();
      
      return { hash, receipt };
    } catch (error: any) {
      console.error('Error restaking expired stake:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Prepare claim (anyone can call)
  const prepareClaim = async (ticker: string) => {
    if (!walletClient || !address) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    try {
      const { request } = await publicClient!.simulateContract({
        address: TEAM_CONTRACT_ADDRESS,
        abi: TEAM_ABI,
        functionName: 'prepareClaim',
        args: [ticker],
        account: address,
      });

      const hash = await walletClient.writeContract(request);
      const receipt = await publicClient!.waitForTransactionReceipt({ hash });
      
      return { hash, receipt };
    } catch (error: any) {
      console.error('Error preparing claim:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Claim rewards
  const claimRewards = async (period: bigint, ticker: string, stakeID: bigint) => {
    if (!walletClient || !address || !stakeRewardDistributionAddress) {
      throw new Error('Wallet not connected or distribution address not found');
    }

    setIsLoading(true);
    try {
      const { request } = await publicClient!.simulateContract({
        address: stakeRewardDistributionAddress,
        abi: STAKE_REWARD_DISTRIBUTION_ABI,
        functionName: 'claimRewards',
        args: [period, ticker, stakeID],
        account: address,
      });

      const hash = await walletClient.writeContract(request);
      const receipt = await publicClient!.waitForTransactionReceipt({ hash });
      
      return { hash, receipt };
    } catch (error: any) {
      console.error('Error claiming rewards:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    // State
    currentPeriod,
    isStakingPeriod,
    userStaked,
    teamBalance,
    globalStaked,
    stakeRewardDistributionAddress,
    isLoading,
    
    // Formatted values
    formattedTeamBalance,
    formattedUserStaked,
    formattedGlobalStaked,
    
    // Full precision values (for MAX button)
    fullPrecisionTeamBalance,
    fullPrecisionUserStaked,
    
    // Read functions
    checkPrepareClaimStatus,
    getClaimableAmount,
    checkHasClaimed,
    getUserStakedForPeriod,
    getAllUserStakes,
    
    // Write functions
    stakeTeam,
    earlyEndStake,
    endCompletedStake,
    extendStake,
    restakeExpiredStake,
    prepareClaim,
    claimRewards,
    
    // Refetch functions
    refetchUserStaked,
    refetchBalance,
    refetchPeriod,
  };
}
