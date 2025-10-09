'use client';

import Link from 'next/link';

// Cache the current year to avoid recalculating it on every render
const CURRENT_YEAR = new Date().getFullYear();

const Footer = () => {
  return (
    <footer className="w-full bg-black px-4 md:px-8 py-4 border-t border-[rgba(255,255,255,0.2)] relative z-[100]">
      <div className="max-w-[1200px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Main Info Column */}
          <div>
            <h3 className="text-s font-semibold mb-2">
              LookIntoMaxi {CURRENT_YEAR}
            </h3>
            <p className="text-sm text-[rgb(153,153,153)]">
              End pooled HEX stakes
            </p>
          </div>

          {/* Staking Column */}
          <div>
            <h4 className="text-s font-semibold mb-2 text-white">
              More
            </h4>
            <ul className="space-y-1">
              <li>
                <Link 
                  href="/team" 
                  className="text-sm text-[rgb(153,153,153)] hover:text-white transition-colors"
                >
                  TEAM
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Column */}
          <div>
            <h4 className="text-s font-semibold mb-2 text-white">
              Legal
            </h4>
            <ul className="space-y-1">
              <li>
                <Link 
                  href="/privacy-policy" 
                  className="text-sm text-[rgb(153,153,153)] hover:text-white transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link 
                  href="/terms-and-conditions" 
                  className="text-sm text-[rgb(153,153,153)] hover:text-white transition-colors"
                >
                  Terms and Conditions
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
