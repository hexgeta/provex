'use client'

import React from 'react';
import { useAccount } from 'wagmi';

interface ContractFunctionGuardProps {
  children: React.ReactNode;
  functionName?: string;
  requiresWallet?: boolean;
  fallback?: React.ReactNode;
}

// Perpetual Pool contract write functions that require wallet connection
const WRITE_FUNCTIONS = [
  'pledgeHEX',
  'redeemHEX',
  'endStakeHEX',
  'mintHedron',
  'approve',
  'transfer',
  'transferFrom',
  'burn',
  'burnFrom',
];

// Perpetual Pool contract read functions (view/pure)
const READ_FUNCTIONS = [
  'getCurrentPeriod',
  'getHexDay',
  'getEndStaker',
  'decimals',
  'balanceOf',
  'totalSupply',
  'allowance',
  'name',
  'symbol',
  'CURRENT_PERIOD',
  'CURRENT_STAKE_PRINCIPAL',
  'END_STAKER',
  'HEX_REDEMPTION_RATE',
  'RELOAD_PHASE_DURATION',
  'RELOAD_PHASE_END',
  'RELOAD_PHASE_START',
  'STAKE_END_DAY',
  'STAKE_IS_ACTIVE',
  'STAKE_LENGTH',
  'STAKE_START_DAY',
  'TEAM_CONTRACT_ADDRESS',
];

/**
 * Component that guards Perpetual Pool contract function execution
 * Only renders children when wallet is connected for write operations
 */
export function ContractFunctionGuard({ 
  children, 
  functionName, 
  requiresWallet = true,
  fallback 
}: ContractFunctionGuardProps) {
  const { address, isConnected } = useAccount();

  // Determine if function requires wallet
  const isWriteFunction = functionName ? WRITE_FUNCTIONS.includes(functionName) : requiresWallet;
  const isReadFunction = functionName ? READ_FUNCTIONS.includes(functionName) : false;

  // For read functions, no wallet connection required
  if (isReadFunction) {
    return <>{children}</>;
  }

  // If wallet is not connected and function requires it, show fallback or default message
  if (isWriteFunction && !isConnected) {
    return fallback || (
      <div className="p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
        <p className="text-yellow-400 text-sm">
          Please connect your wallet to execute this function.
        </p>
      </div>
    );
  }

  // Wallet is connected or function doesn't require it
  return <>{children}</>;
}

/**
 * Hook that provides a guard function for Perpetual Pool contract operations
 */
export function useContractGuard() {
  const { address, isConnected } = useAccount();

  const isWriteFunction = (functionName: string) => WRITE_FUNCTIONS.includes(functionName);
  const isReadFunction = (functionName: string) => READ_FUNCTIONS.includes(functionName);

  const guardFunction = (functionName?: string) => {
    // Read functions don't need wallet
    if (functionName && isReadFunction(functionName)) {
      return true;
    }

    // Write functions require wallet connection
    if (functionName && isWriteFunction(functionName) && !isConnected) {
      throw new Error('Wallet not connected. Please connect your wallet to execute contract functions.');
    }

    return true;
  };

  return {
    guardFunction,
    isConnected,
    address,
    isWriteFunction,
    isReadFunction,
  };
}
