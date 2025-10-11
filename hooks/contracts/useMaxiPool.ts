import { useAccount, usePublicClient, useWalletClient, useContractRead } from 'wagmi';
import { Address, parseAbi } from 'viem';
import { useState, useEffect } from 'react';
import { normalizeChainId } from '@/config/testing';

// HEX contract address
const HEX_CONTRACT_ADDRESS = '0x2b591e99afe9f32eaa6214f7b7629768c40eeb39' as Address;

// MAXI contract address
const MAXI_CONTRACT_ADDRESS = '0x0d86eb9f43c57f6ff3bc9e23d8f9d82503f0e84b' as Address;

// Hedron contract address on PulseChain
const HEDRON_CONTRACT_ADDRESS = '0x3819f64f282bf135d62168C1e513280dAF905e06' as Address;

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

// ABI for Hedron contract - for checking minting status
const HEDRON_ABI = [
  {
    "inputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "name": "shareList",
    "outputs": [
      {
        "components": [
          {"internalType": "uint40", "name": "stakeId", "type": "uint40"},
          {"internalType": "uint72", "name": "stakeShares", "type": "uint72"},
          {"internalType": "uint16", "name": "lockedDay", "type": "uint16"},
          {"internalType": "uint16", "name": "stakedDays", "type": "uint16"}
        ],
        "internalType": "struct HEXStakeMinimal",
        "name": "stake",
        "type": "tuple"
      },
      {"internalType": "uint16", "name": "mintedDays", "type": "uint16"},
      {"internalType": "uint8", "name": "launchBonus", "type": "uint8"},
      {"internalType": "uint16", "name": "loanStart", "type": "uint16"},
      {"internalType": "uint16", "name": "loanedDays", "type": "uint16"},
      {"internalType": "uint32", "name": "interestRate", "type": "uint32"},
      {"internalType": "uint8", "name": "paymentsMade", "type": "uint8"},
      {"internalType": "bool", "name": "isLoaned", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export function useMaxiPool() {
  const { address, chain } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const [isLoading, setIsLoading] = useState(false);
  const [endStakeTxHash, setEndStakeTxHash] = useState<string | null>(null);

  // 🔍 LOG: Initial hook state
  const normalizedChainId = normalizeChainId(chain?.id);
  console.log('🔍 [useMaxiPool] Hook initialized', {
    address,
    chainId: chain?.id,
    normalizedChainId,
    chainName: chain?.name,
    publicClient: !!publicClient,
    walletClient: !!walletClient,
  });

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

  const { data: totalSupply, refetch: refetchTotalSupply } = useContractRead({
    address: MAXI_CONTRACT_ADDRESS,
    abi: MAXI_ABI,
    functionName: 'totalSupply',
  });

  const { data: endStaker, refetch: refetchEndStaker } = useContractRead({
    address: MAXI_CONTRACT_ADDRESS,
    abi: MAXI_ABI,
    functionName: 'getEndStaker',
  });

  const { data: hexRedemptionRate, refetch: refetchHexRedemptionRate } = useContractRead({
    address: MAXI_CONTRACT_ADDRESS,
    abi: MAXI_ABI,
    functionName: 'getHEXRedemptionRate',
  });

  const { data: currentHexDay } = useContractRead({
    address: MAXI_CONTRACT_ADDRESS,
    abi: MAXI_ABI,
    functionName: 'getHexDay',
  });

  const { data: stakeEndDay, refetch: refetchStakeEndDay } = useContractRead({
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

  // 🔍 LOG: Contract read results
  console.log('🔍 [useMaxiPool] Contract reads completed', {
    tokenName,
    tokenSymbol,
    userBalance: userBalance?.toString(),
    currentHexDay: currentHexDay?.toString(),
    stakeStartDay: stakeStartDay?.toString(),
    stakeEndDay: stakeEndDay?.toString(),
    hexRedemptionRate: hexRedemptionRate?.toString(),
    endStaker,
    decimals,
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

  // Query Hedron's shareList to check if Hedron was minted for THIS stake
  const stakeId = stakeInfo?.[0]; // First element is the stake ID (bigint)
  const { data: hedronShareDataRaw, refetch: refetchHedronShareData } = useContractRead({
    address: HEDRON_CONTRACT_ADDRESS,
    abi: HEDRON_ABI,
    functionName: 'shareList',
    args: stakeId !== undefined ? [BigInt(stakeId)] : undefined,
    query: { enabled: !!stakeId },
  });

  // 🔍 LOG: Stake information
  console.log('🔍 [useMaxiPool] Stake information', {
    stakeCount: stakeCount?.toString(),
    stakeInfo: stakeInfo ? {
      stakeId: stakeInfo[0]?.toString(),
      stakedHearts: stakeInfo[1]?.toString(),
      stakeShares: stakeInfo[2]?.toString(),
      lockedDay: stakeInfo[3],
      stakedDays: stakeInfo[4],
      unlockedDay: stakeInfo[5],
      isAutoStake: stakeInfo[6],
    } : 'No stake info',
  });

  // Calculate claimable Hedron amount using the same logic as perpetual pools
  // Formula: claimableHedron = stakeShares * (servedDays - mintedDays)
  const stakeShares = stakeInfo?.[2]; // Third element is stakeShares
  const lockedDay = stakeInfo?.[3]; // Fourth element is lockedDay
  const stakedDays = stakeInfo?.[4]; // Fifth element is stakedDays
  const mintedDays = hedronShareDataRaw ? (hedronShareDataRaw as any)[1] : 0;
  
  // Calculate served days
  const servedDays = 
    currentHexDay && lockedDay !== undefined && stakedDays !== undefined
      ? Math.min(Number(currentHexDay) - Number(lockedDay), Number(stakedDays))
      : 0;
  
  // Calculate claimable Hedron
  const claimableHedron = 
    stakeShares && servedDays > Number(mintedDays)
      ? stakeShares * BigInt(servedDays - Number(mintedDays))
      : 0n;

  // Determine if stake is active based on MAXI logic
  // MAXI stake is active if current day is between start and end
  const stakeIsActive = currentHexDay && stakeStartDay && stakeEndDay 
    ? currentHexDay >= stakeStartDay && currentHexDay <= stakeEndDay
    : false;

  // 🔍 LOG: Computed state
  console.log('🔍 [useMaxiPool] Computed state', {
    stakeIsActive,
    currentHexDayValue: currentHexDay?.toString(),
    stakeStartDayValue: stakeStartDay?.toString(),
    stakeEndDayValue: stakeEndDay?.toString(),
    stakeShares: stakeShares?.toString(),
    lockedDay: lockedDay?.toString(),
    stakedDays: stakedDays?.toString(),
    servedDays,
    mintedDays: mintedDays?.toString(),
    claimableHedron: claimableHedron?.toString(),
    hasHedronMinted: stakeInfo ? stakeInfo[5] !== 0 : false,
  });

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
      
      // Refetch contract data to update UI
      await Promise.all([
        refetchEndStaker(),
        refetchStakeEndDay(),
        refetchHexRedemptionRate(),
      ]);
      
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
      
      // Refetch hedron data to update button states
      await refetchHedronShareData();
      
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
      
      // Refetch contract data to update UI
      await Promise.all([
        refetchBalance(),
        refetchTotalSupply(),
        refetchHexRedemptionRate(),
      ]);
      
      return { hash, receipt };
    } catch (error: any) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Check if Hedron has been minted - if claimableHedron is 0, then all Hedron has been minted
  const hasHedronMinted = claimableHedron === 0n && servedDays > 0;

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
    claimableHedron: claimableHedron as bigint,
    
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

