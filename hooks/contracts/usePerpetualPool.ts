import { useAccount, usePublicClient, useWalletClient, useContractRead } from 'wagmi';
import { Address, parseAbi } from 'viem';
import { useState, useEffect } from 'react';
import { PoolTicker } from '@/config/perpetual-pools';
import { getOverrideValue } from '@/config/test-overrides';

// HEX contract address on PulseChain
const HEX_CONTRACT_ADDRESS = '0x2b591e99afe9f32eaa6214f7b7629768c40eeb39' as Address;

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
  'event StakeEnd(uint256 data0, uint256 data1, address indexed stakerAddr, uint40 indexed stakeId)',
]);

// ABI for HEX contract - for querying stake information
const HEX_ABI = parseAbi([
  'function stakeCount(address) view returns (uint256)',
  'function stakeLists(address, uint256) view returns (uint40 stakeId, uint72 stakedHearts, uint72 stakeShares, uint16 lockedDay, uint16 stakedDays, uint16 unlockedDay, bool isAutoStake)',
]);

export function usePerpetualPool(contractAddress: Address, ticker?: PoolTicker) {
  const { address, chain } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const [isLoading, setIsLoading] = useState(false);
  const [endStakeTxHash, setEndStakeTxHash] = useState<string | null>(null);

  // Read contract state
  const { data: stakeIsActiveRaw } = useContractRead({
    address: contractAddress,
    abi: PERPETUAL_POOL_ABI,
    functionName: 'STAKE_IS_ACTIVE',
  });

  const { data: stakeEndDayRaw } = useContractRead({
    address: contractAddress,
    abi: PERPETUAL_POOL_ABI,
    functionName: 'STAKE_END_DAY',
  });

  const { data: stakeStartDayRaw } = useContractRead({
    address: contractAddress,
    abi: PERPETUAL_POOL_ABI,
    functionName: 'STAKE_START_DAY',
  });

  const { data: currentHexDayRaw } = useContractRead({
    address: contractAddress,
    abi: PERPETUAL_POOL_ABI,
    functionName: 'getHexDay',
  });

  const { data: currentPeriodRaw } = useContractRead({
    address: contractAddress,
    abi: PERPETUAL_POOL_ABI,
    functionName: 'getCurrentPeriod',
  });

  const { data: currentStakePrincipalRaw } = useContractRead({
    address: contractAddress,
    abi: PERPETUAL_POOL_ABI,
    functionName: 'CURRENT_STAKE_PRINCIPAL',
  });

  const { data: hexRedemptionRateRaw } = useContractRead({
    address: contractAddress,
    abi: PERPETUAL_POOL_ABI,
    functionName: 'HEX_REDEMPTION_RATE',
  });

  const { data: reloadPhaseEndRaw } = useContractRead({
    address: contractAddress,
    abi: PERPETUAL_POOL_ABI,
    functionName: 'RELOAD_PHASE_END',
  });

  const { data: reloadPhaseStartRaw } = useContractRead({
    address: contractAddress,
    abi: PERPETUAL_POOL_ABI,
    functionName: 'RELOAD_PHASE_START',
  });

  const { data: reloadPhaseDurationRaw } = useContractRead({
    address: contractAddress,
    abi: PERPETUAL_POOL_ABI,
    functionName: 'RELOAD_PHASE_DURATION',
  });

  const { data: stakeLengthRaw } = useContractRead({
    address: contractAddress,
    abi: PERPETUAL_POOL_ABI,
    functionName: 'STAKE_LENGTH',
  });

  const { data: userBalanceRaw, refetch: refetchBalance } = useContractRead({
    address: contractAddress,
    abi: PERPETUAL_POOL_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    enabled: !!address,
  });

  const { data: totalSupplyRaw } = useContractRead({
    address: contractAddress,
    abi: PERPETUAL_POOL_ABI,
    functionName: 'totalSupply',
  });

  const { data: tokenNameRaw } = useContractRead({
    address: contractAddress,
    abi: PERPETUAL_POOL_ABI,
    functionName: 'name',
  });

  const { data: tokenSymbolRaw } = useContractRead({
    address: contractAddress,
    abi: PERPETUAL_POOL_ABI,
    functionName: 'symbol',
  });

  const { data: endStakerRaw } = useContractRead({
    address: contractAddress,
    abi: PERPETUAL_POOL_ABI,
    functionName: 'getEndStaker',
  });

  const { data: teamContractAddressRaw } = useContractRead({
    address: contractAddress,
    abi: PERPETUAL_POOL_ABI,
    functionName: 'TEAM_CONTRACT_ADDRESS',
  });

  const { data: decimalsRaw } = useContractRead({
    address: contractAddress,
    abi: PERPETUAL_POOL_ABI,
    functionName: 'decimals',
  });

  // Query HEX contract for stake information
  const { data: stakeCountRaw } = useContractRead({
    address: HEX_CONTRACT_ADDRESS,
    abi: HEX_ABI,
    functionName: 'stakeCount',
    args: [contractAddress],
  });

  // Query the first (and typically only) stake for the pool
  // Most perpetual pools have their main stake at index 0
  const { data: stakeInfoRaw } = useContractRead({
    address: HEX_CONTRACT_ADDRESS,
    abi: HEX_ABI,
    functionName: 'stakeLists',
    args: [contractAddress, 0n],
    enabled: !!stakeCountRaw && Number(stakeCountRaw) > 0,
  });

  // Apply test overrides to functional read values only
  const stakeIsActive = getOverrideValue(ticker, 'stakeIsActive', stakeIsActiveRaw);
  const stakeEndDay = getOverrideValue(ticker, 'stakeEndDay', stakeEndDayRaw);
  const stakeStartDay = getOverrideValue(ticker, 'stakeStartDay', stakeStartDayRaw);
  const currentHexDay = getOverrideValue(ticker, 'currentHexDay', currentHexDayRaw);
  const currentPeriod = getOverrideValue(ticker, 'currentPeriod', currentPeriodRaw);
  const currentStakePrincipal = getOverrideValue(ticker, 'currentStakePrincipal', currentStakePrincipalRaw);
  const hexRedemptionRate = getOverrideValue(ticker, 'hexRedemptionRate', hexRedemptionRateRaw);
  const reloadPhaseEnd = getOverrideValue(ticker, 'reloadPhaseEnd', reloadPhaseEndRaw);
  const reloadPhaseStart = getOverrideValue(ticker, 'reloadPhaseStart', reloadPhaseStartRaw);
  const reloadPhaseDuration = getOverrideValue(ticker, 'reloadPhaseDuration', reloadPhaseDurationRaw);
  const stakeLength = getOverrideValue(ticker, 'stakeLength', stakeLengthRaw);
  const userBalance = getOverrideValue(ticker, 'userBalance', userBalanceRaw);
  const totalSupply = getOverrideValue(ticker, 'totalSupply', totalSupplyRaw);
  const stakeCount = getOverrideValue(ticker, 'stakeCount', stakeCountRaw);
  const stakeInfo = getOverrideValue(ticker, 'stakeInfo', stakeInfoRaw);
  const endStaker = getOverrideValue(ticker, 'endStaker', endStakerRaw);
  const teamContractAddress = getOverrideValue(ticker, 'teamContractAddress', teamContractAddressRaw);
  const decimals = getOverrideValue(ticker, 'decimals', decimalsRaw);
  
  // These values are not overridden - always use real contract data
  const tokenName = tokenNameRaw;
  const tokenSymbol = tokenSymbolRaw;

  // Fetch end stake transaction hash when stake is ended
  useEffect(() => {
    const fetchEndStakeTxHash = async () => {
      if (!publicClient || !endStaker || endStaker === '0x0000000000000000000000000000000000000000') {
        return;
      }

      try {
        // Search for transactions where the endStaker called the pool contract's endStakeHEX function
        const currentBlock = await publicClient.getBlockNumber();
        const fromBlock = currentBlock - 1000000n > 0n ? currentBlock - 1000000n : 0n;
        
        // Get all logs from the pool contract to find transactions
        const logs = await publicClient.getLogs({
          address: contractAddress,
          fromBlock,
          toBlock: 'latest',
        });
        
        // Check each unique transaction to see if it was from the endStaker calling endStakeHEX
        const checkedTxs = new Set<string>();
        
        for (const log of logs.reverse()) { // Reverse to get most recent first
          if (checkedTxs.has(log.transactionHash)) continue;
          checkedTxs.add(log.transactionHash);
          
          try {
            const tx = await publicClient.getTransaction({ hash: log.transactionHash });
            if (tx.from.toLowerCase() === endStaker.toLowerCase() && tx.to?.toLowerCase() === contractAddress.toLowerCase()) {
              // This is a transaction from endStaker to the pool contract
              // Verify it was calling endStakeHEX by checking the function selector
              if (tx.input.startsWith('0x') && tx.input.length > 10) {
                const functionSelector = tx.input.slice(0, 10);
                // endStakeHEX(uint256,uint40) function selector
                // keccak256('endStakeHEX(uint256,uint40)') = 0x4953a509...
                if (functionSelector === '0x4953a509') {
                  setEndStakeTxHash(log.transactionHash);
                  break;
                }
              }
            }
          } catch (txError) {
            // Skip transactions we can't fetch
            console.error('Error fetching transaction:', txError);
          }
        }
      } catch (error) {
        console.error('Error fetching end stake transaction:', error);
      }
    };

    fetchEndStakeTxHash();
  }, [publicClient, endStaker, contractAddress]);

  // End stake function - automatically fetches stake index and ID
  const endStake = async () => {
    if (!walletClient || !address) {
      throw new Error('Wallet not connected');
    }

    if (!stakeInfo) {
      throw new Error('Stake information not available. Please refresh and try again.');
    }

    setIsLoading(true);
    try {
      // Use index 0 (first stake) and the stakeId from the queried stake info
      const stakeIndex = 0n;
      const stakeIdParam = stakeInfo[0]; // First element is stakeId

      console.log('Ending stake with:', { stakeIndex, stakeIdParam });

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
    // Contract state (with test overrides applied when TESTING_ON = true)
    stakeIsActive: stakeIsActive as boolean | undefined,
    stakeEndDay: stakeEndDay as bigint | undefined,
    stakeStartDay: stakeStartDay as bigint | undefined,
    currentHexDay: currentHexDay as bigint | undefined,
    currentPeriod: currentPeriod as bigint | undefined,
    currentStakePrincipal: currentStakePrincipal as bigint | undefined,
    hexRedemptionRate: hexRedemptionRate as bigint | undefined,
    reloadPhaseEnd: reloadPhaseEnd as bigint | undefined,
    reloadPhaseStart: reloadPhaseStart as bigint | undefined,
    reloadPhaseDuration: reloadPhaseDuration as bigint | undefined,
    stakeLength: stakeLength as bigint | undefined,
    userBalance: userBalance as bigint | undefined,
    totalSupply: totalSupply as bigint | undefined,
    tokenName: tokenName as string | undefined,
    tokenSymbol: tokenSymbol as string | undefined,
    stakeCount: stakeCount as bigint | undefined,
    stakeInfo: stakeInfo as readonly [bigint, bigint, bigint, number, number, number, boolean] | undefined,
    endStaker: endStaker as Address | undefined,
    endStakeTxHash,
    teamContractAddress: teamContractAddress as Address | undefined,
    decimals: decimals as number | undefined,
    
    // Functions
    endStake,
    redeemHex,
    mintHedron,
    refetchBalance,
    
    // State
    isLoading,
    address,
    chain,
    isConnected: !!address,
  };
}

