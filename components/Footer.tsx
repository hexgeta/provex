'use client';

// Cache the current year to avoid recalculating it on every render
const CURRENT_YEAR = new Date().getFullYear();

const Footer = () => {
  return (
    <footer className="w-full bg-black px-4 md:px-8 py-12 border-t border-[rgba(255,255,255,0.1)] relative z-[100]">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Main Info Column */}
          <div>
            <h3 className="text-xl font-bold mb-3 text-white">
              ProveX
            </h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              The future of disintermediation. Trustless proofs replacing middlemen.
            </p>
          </div>

          <div>
            <h4 className="text-base font-semibold mb-3 text-white">
              Links
            </h4>
            <ul className="space-y-2">
              <li>
                <a 
                  href="https://provex.info/" 
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Sacrifice
                </a>
              </li>
              <li>
                <a 
                  href="#use-cases" 
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Use Cases
                </a>
              </li>
            </ul>
          </div>

          {/* Info Column */}
          <div>
            <h4 className="text-base font-semibold mb-3 text-white">
              MrProve
            </h4>
            <p className="text-sm text-gray-400 leading-relaxed">
              Deflationary by design. Every use burns tokens. Every transaction creates scarcity.
            </p>
          </div>
        </div>

        <div className="border-t border-[rgba(255,255,255,0.1)] pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-500">
              © {CURRENT_YEAR} ProveX. All rights reserved.
            </p>
            <p className="text-xs text-gray-600 max-w-md text-center md:text-right">
              This is software you can choose to run or not. Without you running it, it&apos;s just text that sits there. You are the network. You are the future.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
