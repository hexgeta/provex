'use client'

import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { useAppKit } from '@reown/appkit/react'
import { useTransaction } from '@/context/TransactionContext'

export const ConnectButton = () => {
  const { isConnected, address } = useAccount()
  const { open } = useAppKit()
  const { isTransactionPending } = useTransaction()

  if (isConnected && address) {
    return (
      <button
        onClick={() => open()}
        disabled={isTransactionPending}
        className={`px-4 md:px-8 py-2 md:py-2 rounded-md font-semibold transition-colors text-sm md:text-base ${
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
    <button
      onClick={() => open()}
      className="px-4 md:px-8 py-2 md:py-2 bg-white text-black rounded-md font-semibold hover:bg-gray-200 transition-colors text-sm md:text-base"
    >
      Connect Wallet
    </button>
  )
}
