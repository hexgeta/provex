'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { PoolProvider, usePool } from '@/context/PoolContext';
import PoolSelector from '@/components/PoolSelector';
import PoolCountdown from '@/components/PoolCountdown';
import StakeInterface from '@/components/StakeInterface';
import MaxiStakeInterface from '@/components/MaxiStakeInterface';
import useToast from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { ConnectButton } from '@/components/ConnectButton';
import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function HomeContent() {
  const [isTransactionLoading, setIsTransactionLoading] = useState(false);
  const [isCheckingConnection, setIsCheckingConnection] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'end' | 'claim' | 'mint'>('claim');
  const { isConnected } = useAccount();
  const { toast } = useToast();
  const { selectedTicker } = usePool();

  // Check connection status
  useEffect(() => {
    // Wait a brief moment to determine connection status
    const timer = setTimeout(() => {
      setIsCheckingConnection(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [isConnected]);

  // Auto-switch to info tab when switching to MAXI while on mint tab
  useEffect(() => {
    if (selectedTicker === 'MAXI' && activeTab === 'mint') {
      setActiveTab('info');
    }
  }, [selectedTicker, activeTab]);

  // Determine which interface to render
  const renderInterface = () => {
    const sharedProps = {
      activeTab,
      setActiveTab,
      onTransactionStart: () => setIsTransactionLoading(true),
      onTransactionEnd: () => setIsTransactionLoading(false),
      onTransactionSuccess: (message: string, txHash?: string) => {
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
      },
      onTransactionError: (error: string) => {
        toast({
          title: "Transaction Failed",
          description: error || "An error occurred while processing your transaction.",
          variant: "destructive",
        });
      },
    };

    if (selectedTicker === 'MAXI') {
      return <MaxiStakeInterface {...sharedProps} />;
    }

    return <StakeInterface {...sharedProps} />;
  };
  
  return (
    <main className={`flex ${!isConnected && !isCheckingConnection ? 'min-h-screen' : ''} flex-col items-center ${isConnected ? 'pb-24' : ''}`}>
      <AnimatePresence mode="wait">
        {/* Loading State */}
        {isCheckingConnection && (
          <div
            key="loading"
            className="w-full min-h-screen flex items-center justify-center"
          >
            <Loader2 className="w-12 h-12 animate-spin text-white" />
          </div>
        )}

        {/* Hero Section */}
        {!isCheckingConnection && !isConnected && (
          <motion.div
            key="hero"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="w-full px-2 md:px-8 bg-black flex-grow flex items-center justify-center"
          >
            <div className="max-w-6xl mx-auto text-center">
              <h2 className="text-3xl md:text-5xl md:leading-[90px] font-bold text-white">
                Pooled Stake Redemption Front-End
              </h2>
              <p className="text-md md:text-xl text-gray-400 max-w-2xl mx-auto mb-6">
                End pooled stakes. Redeem HEX rewards.
              </p>
              <div className="mt-8">
                <ConnectButton />
              </div>
            </div>
          </motion.div>
        )}

        {/* Connected Content */}
        {!isCheckingConnection && isConnected && (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="w-full"
          >
            {/* Pool Selector with Countdown */}
            <div className="w-full px-2 md:px-8 mt-24">
              <PoolSelector />
            </div>

            {/* Main Content */}
            <div className="w-full px-2 md:px-8 mt-2">
              <div className="max-w-6xl mx-auto">
                {renderInterface()}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

export default function Home() {
  return (
    <PoolProvider>
      <HomeContent />
    </PoolProvider>
  );
} 