import { Transaction, MonitoringConfig } from '@/types/transactions'

export async function fetchTransactions(
  address: string,
  apiKey: string,
  config: MonitoringConfig
): Promise<Transaction[]> {
  const transactions: Transaction[] = []
  const oneHourAgo = Math.floor(Date.now() / 1000) - 3600

  // Fetch normal ETH transactions
  if (config.ETH_TRANSFERS) {
    const ethUrl = `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&sort=desc&apikey=${apiKey}`
    const ethResponse = await fetch(ethUrl)
    const ethData = await ethResponse.json()
    
    if (ethData.status === '1' && ethData.result?.length > 0) {
      const ethTxs = ethData.result
        .filter((tx: any) => {
          const isRecentTx = parseInt(tx.timeStamp) >= oneHourAgo
          const hasValue = tx.value !== '0'
          return isRecentTx && hasValue
        })
        .map((tx: any) => ({
          ...tx,
          type: 'ETH'
        }))
      transactions.push(...ethTxs)
    }
  }

  // Fetch ERC20 token transfers
  if (config.ERC20_TRANSFERS) {
    const erc20Url = `https://api.etherscan.io/api?module=account&action=tokentx&address=${address}&sort=desc&apikey=${apiKey}`
    const erc20Response = await fetch(erc20Url)
    const erc20Data = await erc20Response.json()
    
    if (erc20Data.status === '1' && erc20Data.result?.length > 0) {
      const erc20Txs = erc20Data.result
        .filter((tx: any) => {
          const isRecentTx = parseInt(tx.timeStamp) >= oneHourAgo
          return isRecentTx
        })
        .map((tx: any) => ({
          ...tx,
          type: 'ERC20'
        }))
      transactions.push(...erc20Txs)
    }
  }

  // Fetch NFT transfers (both ERC721 and ERC1155)
  if (config.NFT_TRANSFERS) {
    // ERC721
    const nftUrl = `https://api.etherscan.io/api?module=account&action=tokennfttx&address=${address}&sort=desc&apikey=${apiKey}`
    const nftResponse = await fetch(nftUrl)
    const nftData = await nftResponse.json()
    
    if (nftData.status === '1' && nftData.result?.length > 0) {
      const nftTxs = nftData.result
        .filter((tx: any) => {
          const isRecentTx = parseInt(tx.timeStamp) >= oneHourAgo
          return isRecentTx
        })
        .map((tx: any) => ({
          ...tx,
          type: 'NFT'
        }))
      transactions.push(...nftTxs)
    }

    // ERC1155
    const nft1155Url = `https://api.etherscan.io/api?module=account&action=token1155tx&address=${address}&sort=desc&apikey=${apiKey}`
    const nft1155Response = await fetch(nft1155Url)
    const nft1155Data = await nft1155Response.json()
    
    if (nft1155Data.status === '1' && nft1155Data.result?.length > 0) {
      const nft1155Txs = nft1155Data.result
        .filter((tx: any) => {
          const isRecentTx = parseInt(tx.timeStamp) >= oneHourAgo
          return isRecentTx
        })
        .map((tx: any) => ({
          ...tx,
          type: 'NFT'
        }))
      transactions.push(...nft1155Txs)
    }
  }

  return transactions
}

// Helper function to format transaction details for email
export function formatTransactionDetails(tx: Transaction): string {
  const timestamp = new Date(parseInt(tx.timeStamp) * 1000).toLocaleString('en-US', {
    timeZone: 'America/New_York',
    hour12: true
  })

  let details = `
    <div style="margin: 10px 0; padding: 10px; border: 1px solid #eee; border-radius: 5px;">
      <p><strong>Type:</strong> ${tx.type}</p>
      <p><strong>Time:</strong> ${timestamp}</p>
      <p><strong>From:</strong> ${tx.from}</p>
      <p><strong>To:</strong> ${tx.to}</p>
  `

  if (tx.type === 'ETH') {
    const ethValue = parseFloat(tx.value) / 1e18
    details += `<p><strong>Value:</strong> ${ethValue.toFixed(6)} ETH</p>`
  } else if (tx.type === 'ERC20') {
    const tokenValue = parseFloat(tx.value) / Math.pow(10, parseInt(tx.tokenDecimal || '18'))
    details += `
      <p><strong>Token:</strong> ${tx.tokenSymbol}</p>
      <p><strong>Value:</strong> ${tokenValue.toFixed(6)} ${tx.tokenSymbol}</p>
    `
  } else if (tx.type === 'NFT') {
    details += `
      <p><strong>Token:</strong> ${tx.tokenName}</p>
      <p><strong>Token ID:</strong> ${tx.tokenID}</p>
    `
  }

  details += `
      <p><a href="https://etherscan.io/tx/${tx.hash}" target="_blank" style="color: #0066cc;">View on Etherscan</a></p>
    </div>
  `

  return details
}

// Add rate limiting and retry logic for API calls
export async function fetchWithRetry(
  url: string,
  retries = 3,
  delay = 1000
): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      
      // Check for Etherscan API specific errors
      if (data.status === '0' && data.message.includes('rate limit')) {
        throw new Error('Rate limit exceeded')
      }
      
      return data
    } catch (error) {
      if (i === retries - 1) throw error
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)))
    }
  }
} 