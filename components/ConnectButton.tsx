'use client'

import { useState } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { useAppKit } from '@reown/appkit/react'
import { useTransaction } from '@/context/TransactionContext'
import { DisclaimerDialog } from '@/components/DisclaimerDialog'

export const ConnectButton = () => {
  const { isConnected, address } = useAccount()
  const { open } = useAppKit()
  const { isTransactionPending } = useTransaction()
  const [showDisclaimer, setShowDisclaimer] = useState(false)

  const handleConnectClick = () => {
    // Check if user has accepted disclaimer
    const hasAccepted = localStorage.getItem('disclaimer-accepted')
    if (!hasAccepted) {
      setShowDisclaimer(true)
    } else {
      open()
    }
  }

  const handleDisclaimerAccept = () => {
    setShowDisclaimer(false)
    open()
  }

  if (isConnected && address) {
    return (
      <button
        onClick={() => open()}
        disabled={isTransactionPending}
        className={`px-3 md:px-8 h-10 rounded-md font-semibold transition-colors text-xs md:text-base flex-[0.7] md:flex-none w-full md:w-auto ${
          isTransactionPending 
            ? 'bg-gray-300 text-gray-600 cursor-not-allowed' 
            : 'bg-white text-black hover:bg-gray-200'
        }`}
      >
        {isTransactionPending ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-md animate-spin"></div>
            <span>Pending...</span>
          </div>
        ) : (
          `${address.slice(0, 6)}...${address.slice(-4)}`
        )}
      </button>
    )
  }

  return (
    <>
      <DisclaimerDialog open={showDisclaimer} onAccept={handleDisclaimerAccept} />
      <button
        onClick={handleConnectClick}
        className="px-3 md:px-8 h-10 bg-white text-black rounded-md font-semibold hover:bg-gray-200 transition-colors text-xs md:text-base flex-[0.7] md:flex-none w-full md:w-auto"
      >
        Connect Wallet
      </button>
    </>
  )
}
