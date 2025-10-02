'use client';

import { useAccount, useSwitchChain } from 'wagmi';
import { mainnet } from '@reown/appkit/networks';
import { ChevronDown } from 'lucide-react';
import Image from 'next/image';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const CHAINS = [
  {
    id: 369,
    name: 'PulseChain',
    icon: '/coin-logos/PLS-white.svg',
  },
  {
    id: mainnet.id,
    name: 'Ethereum',
    icon: '/coin-logos/ETH-white.svg',
  },
];

export function ChainSwitcher() {
  const { chain, isConnected } = useAccount();
  const { switchChain } = useSwitchChain();

  const currentChain = CHAINS.find((c) => c.id === chain?.id) || CHAINS[0];

  if (!isConnected) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-3 px-4 py-2 bg-black/40 border border-white/10 rounded-md hover:bg-white/5 transition-colors w-[210px] focus:outline-none focus-visible:outline-none">
        <Image
          src={currentChain.icon}
          alt={currentChain.name}
          width={20}
          height={20}
          className="w-4 h-4"
        />
        <span className="text-white font-medium">{currentChain.name}</span>
        <ChevronDown className="w-4 h-4 text-white/70" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-black/95 border rounded-md border-white/10 backdrop-blur-sm z-[200] w-[210px]">
        {CHAINS.map((chainOption) => (
          <DropdownMenuItem
            key={chainOption.id}
            onClick={() => switchChain({ chainId: chainOption.id })}
            className="group flex items-center gap-3 px-4 py-2 cursor-pointer text-white hover:text-black focus:text-white data-[highlighted]:text-black hover:bg-white focus:bg-white/5 data-[highlighted]:bg-white"
          >
            <Image
              src={chainOption.icon}
              alt={chainOption.name}
              width={20}
              height={20}
              className="w-4 h-4 group-hover:brightness-0 transition-all"
            />
            <span>{chainOption.name}</span>
            {chain?.id === chainOption.id && (
              <span className="ml-auto text-green-400">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

