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
    <nav className="w-full bg-black/60 px-8 py-4 top-0 left-0 right-0 z-[100] border-b border-[rgba(255,255,255,0.2)]">
      <div className="max-w-[1200px] mx-auto flex items-center justify-between">
        <Link href="/" className="text-white font-bold text-xl md:text-3xl hidden md:block">
          LookIntoMaxi
        </Link>
        <div className="flex items-center gap-4">
          <ChainSwitcher isCheckingConnection={isCheckingConnection} />
          <ConnectButton />
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
