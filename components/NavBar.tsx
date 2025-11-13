'use client'

import Link from 'next/link';

const NavBar = () => {
  return (
    <nav className="w-full bg-black/80 backdrop-blur-md px-4 md:px-8 py-6 fixed top-0 left-0 right-0 z-[100] border-b border-[rgba(255,255,255,0.1)]">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/" className="text-white font-bold text-2xl md:text-3xl tracking-wide" style={{ fontWeight: 700 }}>
          ProveX
        </Link>
        <div className="flex items-center gap-6">
          <a 
            href="#learn-more" 
            className="text-gray-300 hover:text-white transition-colors text-sm md:text-base"
          >
            Technology
          </a>
          <a 
            href="#use-cases" 
            className="hidden sm:block text-gray-300 hover:text-white transition-colors text-sm md:text-base"
          >
            Use Cases
          </a>
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
