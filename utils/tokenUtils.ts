import { TOKEN_CONSTANTS } from '@/constants/crypto';

// Function to get token logo URL based on ticker
function getTokenLogo(ticker: string): string {
  const logoMap: Record<string, string> = {
    // Base tokens
    'PLS': '/coin-logos/PLS.svg',
    'WPLS': '/coin-logos/PLS.svg', // Wrapped PLS uses PLS logo
    'PLSX': '/coin-logos/PLSX.svg',
    'HEX': '/coin-logos/HEX.svg',
    'ETH': '/coin-logos/ETH.svg',
    'BASE': '/coin-logos/BASE.svg',
    'MAXI': '/coin-logos/MAXI.svg',
    'DECI': '/coin-logos/DECI.svg',
    'LUCKY': '/coin-logos/LUCKY.svg',
    'TRIO': '/coin-logos/TRIO.svg',
    'INC': '/coin-logos/INC.svg',
    'PCOCK': '/coin-logos/PCOCK.svg',
    'HTT3000': '/coin-logos/HTT3000.svg',
    'HTT5000': '/coin-logos/HTT5000.svg',
    'HTT7000': '/coin-logos/HTT7000.svg',
    'ALAMO': '/coin-logos/ALAMO.svg',
    'BRIAH': '/coin-logos/BRIAH.svg',
    'weHEX': '/coin-logos/weHEX.svg',
    'weMAXI': '/coin-logos/weMAXI.svg',
    'weDECI': '/coin-logos/weDECI.svg',
    'weLUCKY': '/coin-logos/weLUCKY.svg',
    'weTRIO': '/coin-logos/weTRIO.svg',
    'weBASE': '/coin-logos/weBASE.svg',
    'weWETH': '/coin-logos/weWETH.svg',
    'weDAI': '/coin-logos/weDAI.svg',
    'weUSDC': '/coin-logos/weUSDC.svg',
    'weUSDT': '/coin-logos/weUSDT.svg',
    'HDRN': '/coin-logos/HDRN.svg',
    'ICSA': '/coin-logos/ICSA.svg',
    'COM': '/coin-logos/COM.svg',
    'YEP': '/coin-logos/YEP.svg',
    'EDAI': '/coin-logos/EDAI.svg',
    'eDAI': '/coin-logos/EDAI.svg',
    'DAI': '/coin-logos/weDAI.svg', // DAI uses weDAI logo
  };
  
  return logoMap[ticker] || '/coin-logos/default.svg';
}

// Create a map of token addresses to token info from TOKEN_CONSTANTS
const TOKEN_MAP = new Map<string, { ticker: string; name: string; decimals: number; logo: string }>([
  // Add tokens from TOKEN_CONSTANTS (only if they have an address)
  ...TOKEN_CONSTANTS
    .filter(token => token.a && token.a.trim() !== '')
    .map(token => [
      token.a.toLowerCase(),
      {
        ticker: token.ticker,
        name: token.name,
        decimals: token.decimals,
        logo: getTokenLogo(token.ticker)
      }
    ] as [string, { ticker: string; name: string; decimals: number; logo: string }]),
  // Add contract's native address mapping to PLS
  ['0x000000000000000000000000000000000000dead', {
    ticker: 'PLS',
    name: 'Pulse',
    decimals: 18,
    logo: getTokenLogo('PLS')
  }] as [string, { ticker: string; name: string; decimals: number; logo: string }],
]);


// Function to get token info by address
export function getTokenInfo(address: string): {
  ticker: string;
  name: string;
  decimals: number;
  logo: string;
  address: string;
} {
  // Handle native token mapping - contract uses 0xdEaD, frontend uses 0x0
  const normalizedAddress = address.toLowerCase();
  const nativeAddresses = ['0x0', '0x0000000000000000000000000000000000000000', '0x000000000000000000000000000000000000dead'];
  
  let searchAddress = normalizedAddress;
  if (nativeAddresses.includes(normalizedAddress)) {
    // Try to find PLS token info using any of the native addresses
    for (const nativeAddr of nativeAddresses) {
      const tokenInfo = TOKEN_MAP.get(nativeAddr);
      if (tokenInfo) {
        return {
          ...tokenInfo,
          address: address // Return the original address passed in
        };
      }
    }
  }
  
  const tokenInfo = TOKEN_MAP.get(searchAddress);
  if (tokenInfo) {
    return {
      ...tokenInfo,
      address: address
    };
  }
  
  // Fallback for unknown tokens
  return {
    ticker: formatAddress(address),
    name: 'Unknown Token',
    decimals: 18,
    logo: '/coin-logos/default.svg',
    address: address
  };
}

// Function to format address for display
export function formatAddress(address: string): string {
  // Format address as '0x...[last 4 characters]'
  if (address.startsWith('0x') && address.length > 6) {
    return `0x...${address.slice(-4)}`;
  }
  return address; // Return original if not a long enough address to truncate
}

// Function to format token ticker for display (convert 'we' to 'e')
export function formatTokenTicker(ticker: string): string {
  // Convert 'we' prefixed tokens to 'e' prefixed for display
  if (ticker.startsWith('we')) {
    return 'e' + ticker.slice(2);
  }
  return ticker;
}

// Function to get token info by index (for buy tokens)
// This maps contract token indices to actual token addresses
export function getTokenInfoByIndex(index: number) {
  // Map contract token indices to actual token addresses
  // Based on the contract's whitelist order
  const contractTokenMap: Record<number, string> = {
    0: '0x95b303987a60c71504d99aa1b13b4da07b0790ab', // PLSX - PulseX
    1: '0xefd766ccb38eaf1dfd701853bfce31359239f305', // weDAI - Wrapped DAI from Eth
    2: '0x000000000000000000000000000000000000dead', // PLS - Pulse
    3: '0x2fa878ab3f87cc1c9737fc071108f904c0b0c95d', // INC - Incentive
    4: '0x2b591e99afe9f32eaa6214f7b7629768c40eeb39', // HEX - HEX on Pls
    5: '0x0deed1486bc52aa0d3e6f8849cec5add6598a162', // stPLS (Liquid Loans)
    6: '0x02dcdd04e3f455d838cd1249292c58f3b79e3c3c', // weWETH - Wrapped WETH from Eth
    7: '0x15d38573d2feeb82e7ad5187ab8c1d52810b1f07', // weUSDC - Wrapped USDC from Eth (INACTIVE)
    8: '0x0cb6f5a34ad42ec934882a05265a7d5f59b51a2f', // weUSDT - Wrapped USDT from Eth (INACTIVE)
    9: '0x115f3fa979a936167f9d208a7b7c4d85081e84bd', // 2PHUX - 2PHUX Governance Token
  };
  
  const address = contractTokenMap[index];
  if (address) {
    const tokenInfo = getTokenInfo(address);
    return {
      ...tokenInfo,
      address: address
    };
  }
  
  return {
    address: '0x0000000000000000000000000000000000000000',
    ticker: 'UNKNOWN',
    name: 'Unknown Token',
    logo: '/coin-logos/default.svg',
    decimals: 18
  };
}

// Function to parse token amount to wei based on token decimals
export function parseTokenAmount(amount: string, decimals: number): bigint {
  const cleanAmount = amount.replace(/,/g, '');
  const [integerPart, decimalPart = ''] = cleanAmount.split('.');
  
  // Pad decimal part to match token decimals
  const paddedDecimalPart = decimalPart.padEnd(decimals, '0').slice(0, decimals);
  
  // Combine integer and decimal parts
  const fullAmount = integerPart + paddedDecimalPart;
  
  return BigInt(fullAmount);
}

// Function to format token amount from wei based on token decimals
export function formatTokenAmount(amount: bigint, decimals: number): string {
  const amountStr = amount.toString();
  
  if (amountStr.length <= decimals) {
    // Amount is less than 1 token
    const paddedAmount = amountStr.padStart(decimals, '0');
    const decimalPart = paddedAmount.slice(-decimals);
    return `0.${decimalPart}`.replace(/\.?0+$/, '') || '0';
  }
  
  const integerPart = amountStr.slice(0, -decimals);
  const decimalPart = amountStr.slice(-decimals);
  
  // Remove trailing zeros from decimal part
  const trimmedDecimalPart = decimalPart.replace(/0+$/, '');
  
  if (trimmedDecimalPart === '') {
    return integerPart;
  }
  
  return `${integerPart}.${trimmedDecimalPart}`;
}
