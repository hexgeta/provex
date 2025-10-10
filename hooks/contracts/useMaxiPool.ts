import { useAccount, usePublicClient, useWalletClient, useContractRead } from 'wagmi';
import { Address, parseAbi } from 'viem';
import { useState, useEffect, useMemo } from 'react';

// HEX contract addresses by chain
const HEX_CONTRACT_ADDRESSES: Record<number, Address> = {
  1: '0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39' as Address, // Ethereum
  369: '0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39' as Address, // PulseChain (same checksum as ETH)
};

// MAXI contract address (same on both chains)
const MAXI_CONTRACT_ADDRESS = '0x0d86EB9f43C57f6FF3BC9E23D8F9d82503f0e84b' as Address;

// ABI for the MAXI contract - different from perpetual pools
const MAXI_ABI = parseAbi([
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function totalSupply() view returns (uint256)',
  'function getEndStaker() view returns (address)',
  'function getHEXRedemptionRate() view returns (uint256)',
  'function getHedronDay() view returns (uint256)',
  'function getHedronRedemptionRate() view returns (uint256)',
  'function getHexDay() view returns (uint256)',
  'function getMintingPhaseEndDay() view returns (uint256)',
  'function getMintingPhaseStartDay() view returns (uint256)',
  'function getStakeEndDay() view returns (uint256)',
  'function getStakeStartDay() view returns (uint256)',
  'function endStakeHEX(uint256 stakeIndex, uint40 stakeIdParam)',
  'function redeemHEX(uint256 amount)',
  'function stakeHEX(uint256 amount)',
  'function pledgeHEX(uint256 amount)',
  'function mintHedron(uint256 stakeIndex, uint40 stakeId)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transfer(address recipient, uint256 amount) returns (bool)',
  'event StakeEnd(uint256 data0, uint256 data1, address indexed stakerAddr, uint40 indexed stakeId)',
]);

// ABI for HEX contract - for querying stake information
const HEX_ABI = parseAbi([
  'function stakeCount(address) view returns (uint256)',
  'function stakeLists(address, uint256) view returns (uint40 stakeId, uint72 stakedHearts, uint72 stakeShares, uint16 lockedDay, uint16 stakedDays, uint16 unlockedDay, bool isAutoStake)',
]);

export function useMaxiPool() {
  const { address, chain } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const [isLoading, setIsLoading] = useState(false);
  const [endStakeTxHash, setEndStakeTxHash] = useState<string | null>(null);

  // Get the correct HEX contract address for the current chain
  const HEX_CONTRACT_ADDRESS = useMemo(() => {
    const chainId = chain?.id || 369; // Default to PulseChain
    return HEX_CONTRACT_ADDRESSES[chainId] || HEX_CONTRACT_ADDRESSES[369];
  }, [chain?.id]);

  // Read contract state
  const { data: userBalance, refetch: refetchBalance } = useContractRead({
    address: MAXI_CONTRACT_ADDRESS,
    abi: MAXI_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  const { data: tokenName } = useContractRead({
    address: MAXI_CONTRACT_ADDRESS,
    abi: MAXI_ABI,
    functionName: 'name',
  });

  const { data: tokenSymbol } = useContractRead({
    address: MAXI_CONTRACT_ADDRESS,
    abi: MAXI_ABI,
    functionName: 'symbol',
  });

  const { data: decimals } = useContractRead({
    address: MAXI_CONTRACT_ADDRESS,
    abi: MAXI_ABI,
    functionName: 'decimals',
  });

  const { data: totalSupply } = useContractRead({
    address: MAXI_CONTRACT_ADDRESS,
    abi: MAXI_ABI,
    functionName: 'totalSupply',
  });

  const { data: endStaker } = useContractRead({
    address: MAXI_CONTRACT_ADDRESS,
    abi: MAXI_ABI,
    functionName: 'getEndStaker',
  });

  const { data: hexRedemptionRate } = useContractRead({
    address: MAXI_CONTRACT_ADDRESS,
    abi: MAXI_ABI,
    functionName: 'getHEXRedemptionRate',
  });

  const { data: currentHexDay } = useContractRead({
    address: MAXI_CONTRACT_ADDRESS,
    abi: MAXI_ABI,
    functionName: 'getHexDay',
  });

  const { data: stakeEndDay } = useContractRead({
    address: MAXI_CONTRACT_ADDRESS,
    abi: MAXI_ABI,
    functionName: 'getStakeEndDay',
  });

  const { data: stakeStartDay } = useContractRead({
    address: MAXI_CONTRACT_ADDRESS,
    abi: MAXI_ABI,
    functionName: 'getStakeStartDay',
  });

  const { data: mintingPhaseStartDay } = useContractRead({
    address: MAXI_CONTRACT_ADDRESS,
    abi: MAXI_ABI,
    functionName: 'getMintingPhaseStartDay',
  });

  const { data: mintingPhaseEndDay } = useContractRead({
    address: MAXI_CONTRACT_ADDRESS,
    abi: MAXI_ABI,
    functionName: 'getMintingPhaseEndDay',
  });

  // Query HEX contract for stake information
  const { data: stakeCount } = useContractRead({
    address: HEX_CONTRACT_ADDRESS,
    abi: HEX_ABI,
    functionName: 'stakeCount',
    args: [MAXI_CONTRACT_ADDRESS],
    query: {
      enabled: !!HEX_CONTRACT_ADDRESS,
    },
  });

  // Query the first stake for MAXI
  const { data: stakeInfo } = useContractRead({
    address: HEX_CONTRACT_ADDRESS,
    abi: HEX_ABI,
    functionName: 'stakeLists',
    args: [MAXI_CONTRACT_ADDRESS, 0n],
    query: {
      enabled: !!stakeCount && Number(stakeCount) > 0 && !!HEX_CONTRACT_ADDRESS,
    },
  });

  // Determine if stake is active based on MAXI logic
  // MAXI stake is active if current day is between start and end
  const stakeIsActive = currentHexDay && stakeStartDay && stakeEndDay 
    ? currentHexDay >= stakeStartDay && currentHexDay <= stakeEndDay
    : false;

  // Fetch end stake transaction hash when stake is ended
  useEffect(() => {
    const fetchEndStakeTxHash = async () => {
      if (!publicClient || !endStaker || endStaker === '0x0000000000000000000000000000000000000000') {
        return;
      }

      try {
        const currentBlock = await publicClient.getBlockNumber();
        const fromBlock = currentBlock - 1000000n > 0n ? currentBlock - 1000000n : 0n;
        
        const logs = await publicClient.getLogs({
          address: MAXI_CONTRACT_ADDRESS,
          fromBlock,
          toBlock: 'latest',
        });
        
        const checkedTxs = new Set<string>();
        
        for (const log of logs.reverse()) {
          if (checkedTxs.has(log.transactionHash)) continue;
          checkedTxs.add(log.transactionHash);
          
          try {
            const tx = await publicClient.getTransaction({ hash: log.transactionHash });
            if (tx.from.toLowerCase() === endStaker.toLowerCase() && tx.to?.toLowerCase() === MAXI_CONTRACT_ADDRESS.toLowerCase()) {
              if (tx.input.startsWith('0x') && tx.input.length > 10) {
                const functionSelector = tx.input.slice(0, 10);
                // endStakeHEX(uint256,uint40) function selector
                if (functionSelector === '0x4953a509') {
                  setEndStakeTxHash(log.transactionHash);
                  break;
                }
              }
            }
          } catch (txError) {
            // Silent fail
          }
        }
      } catch (error) {
        // Silent fail
      }
    };

    fetchEndStakeTxHash();
  }, [publicClient, endStaker]);

  // End stake function
  const endStake = async () => {
    if (!walletClient || !address) {
      throw new Error('Wallet not connected');
    }

    if (!stakeInfo) {
      throw new Error('Stake information not available. Please refresh and try again.');
    }

    setIsLoading(true);
    try {
      const stakeIndex = 0n;
      const stakeIdParam = stakeInfo[0]; // First element is stakeId

      const { request } = await publicClient!.simulateContract({
        address: MAXI_CONTRACT_ADDRESS,
        abi: MAXI_ABI,
        functionName: 'endStakeHEX',
        args: [stakeIndex, stakeIdParam],
        account: address,
      });

      const hash = await walletClient.writeContract(request);
      
      const receipt = await publicClient!.waitForTransactionReceipt({ hash });
      
      return { hash, receipt };
    } catch (error: any) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Mint Hedron function
  const mintHedron = async (stakeIndex: bigint, stakeIdParam: number) => {
    if (!walletClient || !address) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    try {
      const { request } = await publicClient!.simulateContract({
        address: MAXI_CONTRACT_ADDRESS,
        abi: MAXI_ABI,
        functionName: 'mintHedron',
        args: [stakeIndex, stakeIdParam],
        account: address,
      });

      const hash = await walletClient.writeContract(request);
      
      const receipt = await publicClient!.waitForTransactionReceipt({ hash });
      
      return { hash, receipt };
    } catch (error: any) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Redeem HEX function
  const redeemHex = async (amount: bigint) => {
    if (!walletClient || !address) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    try {
      const { request } = await publicClient!.simulateContract({
        address: MAXI_CONTRACT_ADDRESS,
        abi: MAXI_ABI,
        functionName: 'redeemHEX',
        args: [amount],
        account: address,
      });

      const hash = await walletClient.writeContract(request);
      
      const receipt = await publicClient!.waitForTransactionReceipt({ hash });
      
      await refetchBalance();
      
      return { hash, receipt };
    } catch (error: any) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Check if Hedron has been minted by checking if unlockedDay is 0
  // unlockedDay is at index 5 in the stakeInfo tuple
  const hasHedronMinted = stakeInfo ? stakeInfo[5] !== 0 : false;

  return {
    // Contract state
    stakeIsActive,
    stakeEndDay: stakeEndDay as bigint | undefined,
    stakeStartDay: stakeStartDay as bigint | undefined,
    currentHexDay: currentHexDay as bigint | undefined,
    hexRedemptionRate: hexRedemptionRate as bigint | undefined,
    userBalance: userBalance as bigint | undefined,
    totalSupply: totalSupply as bigint | undefined,
    tokenName: tokenName as string | undefined,
    tokenSymbol: tokenSymbol as string | undefined,
    stakeCount: stakeCount as bigint | undefined,
    stakeInfo: stakeInfo as readonly [bigint, bigint, bigint, number, number, number, boolean] | undefined,
    endStaker: endStaker as Address | undefined,
    endStakeTxHash,
    decimals: decimals as number | undefined,
    mintingPhaseStartDay: mintingPhaseStartDay as bigint | undefined,
    mintingPhaseEndDay: mintingPhaseEndDay as bigint | undefined,
    hasHedronMinted,
    
    // Functions
    endStake,
    mintHedron,
    redeemHex,
    refetchBalance,
    
    // State
    isLoading,
    address,
    chain,
    isConnected: !!address,
  };
}

