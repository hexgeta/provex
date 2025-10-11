'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { usePool } from '@/context/PoolContext';
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
    // Wait a brief moment to determine connection status and coordinate with background fade-in
    const timer = setTimeout(() => {
      setIsCheckingConnection(false);
    }, 100);
    
    return () => clearTimeout(timer);
  }, [isConnected]);

  // Auto-switch to info tab when switching to MAXI while on mint tab
  useEffect(() => {
    if ((selectedTicker === 'MAXI' || selectedTicker === 'eMAXI') && activeTab === 'mint') {
      setActiveTab('info');
    }
  }, [selectedTicker, activeTab]);

  // Determine which interface to render
  const renderInterface = () => {
    // 🔍 LOG: Determine which interface to render
    console.log('🔍 [page.tsx] Rendering interface', {
      selectedTicker,
      willRenderMaxiInterface: selectedTicker === 'MAXI' || selectedTicker === 'eMAXI',
    });

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
        // Check if user cancelled/rejected the transaction
        const isCancelled = error?.toLowerCase().includes('rejected') || 
                           error?.toLowerCase().includes('denied') ||
                           error?.toLowerCase().includes('user rejected');
        
        toast({
          title: isCancelled ? "Cancelled" : "Transaction Failed",
          description: isCancelled ? undefined : (error || "An error occurred while processing your transaction."),
          variant: "destructive",
        });
      },
    };

    if (selectedTicker === 'MAXI' || selectedTicker === 'eMAXI') {
      return <MaxiStakeInterface {...sharedProps} />;
    }

    return <StakeInterface {...sharedProps} />;
  };
  
  return (
    <main className="flex flex-col items-center pb-6 md:pb-16">
      <AnimatePresence mode="wait">
        {/* Loading State */}
        {isCheckingConnection && (
          <div
            key="loading"
            className="w-full flex items-center justify-center py-16 md:py-32"
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
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="w-full px-2 md:px-8 bg-transparent flex items-center justify-center"
            style={{ minHeight: 'calc(100vh - 200px)' }}
          >
            <div className="max-w-6xl mx-auto text-center">
              <h2 className="text-4xl md:text-6xl font-bold text-white mb-4 md:mb-6">
                Pooled Stake Management Dapp
              </h2>
              <p className="text-lg md:text-2xl text-gray-400 max-w-2xl mx-auto">
                End pooled stakes. Redeem HEX rewards.
              </p>
            </div>
          </motion.div>
        )}

        {/* Connected Content */}
        {!isCheckingConnection && isConnected && (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="w-full"
          >
            {/* Pool Selector with Countdown */}
            <div className="w-full px-2 md:px-8 mt-6 md:mt-16">
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
  return <HomeContent />;
} 