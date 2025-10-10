'use client'

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import Link from 'next/link';
import { ConnectButton } from './ConnectButton';
import { ChainSwitcher } from './ChainSwitcher';

const NavBar = () => {
  const [isCheckingConnection, setIsCheckingConnection] = useState(true);
  const { isConnected } = useAccount();

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsCheckingConnection(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [isConnected]);

  return (
    <nav className="w-full bg-black backdrop-blur-xs px-4 md:px-8 py-4 top-0 left-0 right-0 z-[100] border-b border-[rgba(255,255,255,0.2)]">
      <div className="max-w-[1200px] mx-auto flex flex-col lg:flex-row items-center justify-center lg:justify-between gap-3 lg:gap-0">
        <Link href="/" className="text-white font-bold text-3xl md:text-3xl w-full lg:w-auto text-center lg:text-left py-2 lg:py-0">
          LookIntoMaxi
        </Link>
        <div className="flex items-center gap-2 md:gap-4 w-full lg:w-auto justify-center">
          <ChainSwitcher isCheckingConnection={isCheckingConnection} />
          <ConnectButton />
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
