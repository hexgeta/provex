'use client'

import { SWRConfig } from 'swr'
import { swrConfig } from '@/utils/swr-config'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { TransactionProvider } from '@/context/TransactionContext'
import { PoolProvider } from '@/context/PoolContext'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      <SWRConfig value={swrConfig}>
        <TransactionProvider>
          <PoolProvider>
            {children}
          </PoolProvider>
        </TransactionProvider>
      </SWRConfig>
    </QueryClientProvider>
  )
} 