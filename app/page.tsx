'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { PoolProvider } from '@/context/PoolContext';
import PoolSelector from '@/components/PoolSelector';
import CountdownTimer from '@/components/CountdownTimer';
import StakeInterface from '@/components/StakeInterface';
import useToast from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';

export default function Home() {
  const [isTransactionLoading, setIsTransactionLoading] = useState(false);
  const { isConnected } = useAccount();
  const { toast } = useToast();
  
  return (
    <PoolProvider>
      <main className="flex min-h-screen flex-col items-center pb-12">
        {/* Hero Section */}
        <div className="w-full px-2 md:px-8 mt-24 mb-8 bg-black">
          <div className="max-w-6xl mx-auto text-center">
            <h2 className="text-3xl md:text-5xl md:leading-[90px] font-bold text-white mb-4">
              Claim your HEX boi
            </h2>
            <p className="text-md md:text-xl text-gray-400 max-w-2xl mx-auto mb-6">
              End your stake and claim your tokens before the deadline
            </p>
          </div>
        </div>

        {/* Pool Selector */}
        <div className="w-full px-2 md:px-8">
          <PoolSelector />
        </div>

        {/* Countdown Timer */}
        <div className="w-full px-2 md:px-8">
          <CountdownTimer />
        </div>

        {/* Main Content */}
        <div className="w-full px-2 md:px-8 mt-2">
          <div className="max-w-6xl mx-auto">
            <StakeInterface 
              onTransactionStart={() => setIsTransactionLoading(true)}
              onTransactionEnd={() => setIsTransactionLoading(false)}
              onTransactionSuccess={(message, txHash) => {
                toast({
                  title: "Transaction Successful!",
                  description: message || "Your transaction has been processed successfully.",
                  variant: "success",
                  action: txHash ? (
                    <ToastAction
                      altText="View transaction"
                      onClick={() => window.open(`https://otter.pulsechain.com/tx/${txHash}`, '_blank')}
                    >
                      View TX
                    </ToastAction>
                  ) : undefined,
                });
              }}
              onTransactionError={(error) => {
                toast({
                  title: "Transaction Failed",
                  description: error || "An error occurred while processing your transaction.",
                  variant: "destructive",
                });
              }}
            />
          </div>
        </div>
      </main>
    </PoolProvider>
  );
} 