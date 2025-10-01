import { useAccount, usePublicClient, useWalletClient, useContractRead } from 'wagmi';
import { Address, parseAbi } from 'viem';
import { useState } from 'react';

// ABI for the Perpetual Pool contract - only including functions we need
const PERPETUAL_POOL_ABI = parseAbi([
  'function CURRENT_PERIOD() view returns (uint256)',
  'function CURRENT_STAKE_PRINCIPAL() view returns (uint256)',
  'function END_STAKER() view returns (address)',
  'function HEX_REDEMPTION_RATE() view returns (uint256)',
  'function RELOAD_PHASE_DURATION() view returns (uint256)',
  'function RELOAD_PHASE_END() view returns (uint256)',
  'function RELOAD_PHASE_START() view returns (uint256)',
  'function STAKE_END_DAY() view returns (uint256)',
  'function STAKE_IS_ACTIVE() view returns (bool)',
  'function STAKE_LENGTH() view returns (uint256)',
  'function STAKE_START_DAY() view returns (uint256)',
  'function TEAM_CONTRACT_ADDRESS() view returns (address)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function getCurrentPeriod() view returns (uint256)',
  'function getHexDay() view returns (uint256)',
  'function getEndStaker() view returns (address)',
  'function pledgeHEX(uint256 amount)',
  'function redeemHEX(uint256 amount)',
  'function endStakeHEX(uint256 stakeIndex, uint40 stakeIdParam)',
  'function mintHedron(uint256 stakeIndex, uint40 stakeId)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transfer(address recipient, uint256 amount) returns (bool)',
]);

export function usePerpetualPool(contractAddress: Address) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const [isLoading, setIsLoading] = useState(false);

  // Read contract state
  const { data: stakeIsActive } = useContractRead({
    address: contractAddress,
    abi: PERPETUAL_POOL_ABI,
    functionName: 'STAKE_IS_ACTIVE',
  });

  const { data: stakeEndDay } = useContractRead({
    address: contractAddress,
    abi: PERPETUAL_POOL_ABI,
    functionName: 'STAKE_END_DAY',
  });

  const { data: currentHexDay } = useContractRead({
    address: contractAddress,
    abi: PERPETUAL_POOL_ABI,
    functionName: 'getHexDay',
  });

  const { data: currentPeriod } = useContractRead({
    address: contractAddress,
    abi: PERPETUAL_POOL_ABI,
    functionName: 'getCurrentPeriod',
  });

  const { data: hexRedemptionRate } = useContractRead({
    address: contractAddress,
    abi: PERPETUAL_POOL_ABI,
    functionName: 'HEX_REDEMPTION_RATE',
  });

  const { data: reloadPhaseEnd } = useContractRead({
    address: contractAddress,
    abi: PERPETUAL_POOL_ABI,
    functionName: 'RELOAD_PHASE_END',
  });

  const { data: userBalance, refetch: refetchBalance } = useContractRead({
    address: contractAddress,
    abi: PERPETUAL_POOL_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    enabled: !!address,
  });

  const { data: totalSupply } = useContractRead({
    address: contractAddress,
    abi: PERPETUAL_POOL_ABI,
    functionName: 'totalSupply',
  });

  const { data: tokenName } = useContractRead({
    address: contractAddress,
    abi: PERPETUAL_POOL_ABI,
    functionName: 'name',
  });

  const { data: tokenSymbol } = useContractRead({
    address: contractAddress,
    abi: PERPETUAL_POOL_ABI,
    functionName: 'symbol',
  });

  // End stake function
  const endStake = async (stakeIndex: bigint, stakeIdParam: number) => {
    if (!walletClient || !address) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    try {
      const { request } = await publicClient!.simulateContract({
        address: contractAddress,
        abi: PERPETUAL_POOL_ABI,
        functionName: 'endStakeHEX',
        args: [stakeIndex, stakeIdParam],
        account: address,
      });

      const hash = await walletClient.writeContract(request);
      
      const receipt = await publicClient!.waitForTransactionReceipt({ hash });
      
      return { hash, receipt };
    } catch (error: any) {
      console.error('Error ending stake:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Redeem HEX function (claim tokens by burning pool tokens)
  const redeemHex = async (amount: bigint) => {
    if (!walletClient || !address) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    try {
      const { request } = await publicClient!.simulateContract({
        address: contractAddress,
        abi: PERPETUAL_POOL_ABI,
        functionName: 'redeemHEX',
        args: [amount],
        account: address,
      });

      const hash = await walletClient.writeContract(request);
      
      const receipt = await publicClient!.waitForTransactionReceipt({ hash });
      
      // Refetch balance after redemption
      await refetchBalance();
      
      return { hash, receipt };
    } catch (error: any) {
      console.error('Error redeeming HEX:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Mint Hedron function
  const mintHedron = async (stakeIndex: bigint, stakeId: number) => {
    if (!walletClient || !address) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    try {
      const { request } = await publicClient!.simulateContract({
        address: contractAddress,
        abi: PERPETUAL_POOL_ABI,
        functionName: 'mintHedron',
        args: [stakeIndex, stakeId],
        account: address,
      });

      const hash = await walletClient.writeContract(request);
      
      const receipt = await publicClient!.waitForTransactionReceipt({ hash });
      
      return { hash, receipt };
    } catch (error: any) {
      console.error('Error minting Hedron:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    // Contract state
    stakeIsActive: stakeIsActive as boolean | undefined,
    stakeEndDay: stakeEndDay as bigint | undefined,
    currentHexDay: currentHexDay as bigint | undefined,
    currentPeriod: currentPeriod as bigint | undefined,
    hexRedemptionRate: hexRedemptionRate as bigint | undefined,
    reloadPhaseEnd: reloadPhaseEnd as bigint | undefined,
    userBalance: userBalance as bigint | undefined,
    totalSupply: totalSupply as bigint | undefined,
    tokenName: tokenName as string | undefined,
    tokenSymbol: tokenSymbol as string | undefined,
    
    // Functions
    endStake,
    redeemHex,
    mintHedron,
    refetchBalance,
    
    // State
    isLoading,
    address,
    isConnected: !!address,
  };
}

