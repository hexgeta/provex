'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { PoolProvider } from '@/context/PoolContext';
import PoolSelector from '@/components/PoolSelector';
import PoolCountdown from '@/components/PoolCountdown';
import StakeInterface from '@/components/StakeInterface';
import useToast from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { ConnectButton } from '@/components/ConnectButton';

export default function Home() {
  const [isTransactionLoading, setIsTransactionLoading] = useState(false);
  const { isConnected } = useAccount();
  const { toast } = useToast();
  
  return (
    <PoolProvider>
      <main className={`flex ${!isConnected ? 'min-h-screen' : ''} flex-col items-center ${isConnected ? 'pb-16' : ''}`}>
        {/* Hero Section */}
        {!isConnected && (
          <div className="w-full px-2 md:px-8 bg-black flex-grow flex items-center justify-center">
            <div className="max-w-6xl mx-auto text-center">
              <h2 className="text-3xl md:text-5xl md:leading-[90px] font-bold text-white">
                Pooled Stake Redemption Front-End
              </h2>
              <p className="text-md md:text-xl text-gray-400 max-w-2xl mx-auto mb-6">
                End MAXI stakes. Redeem HEX for your stake tokens.
              </p>
              <div className="mt-8">
                <ConnectButton />
              </div>
            </div>
          </div>
        )}

        {/* Pool Selector with Countdown */}
        {isConnected && (
          <div className="w-full px-2 md:px-8 mt-24">
            <PoolSelector />
          </div>
        )}

        {/* Main Content */}
        {isConnected && (
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
        )}
      </main>
    </PoolProvider>
  );
} 