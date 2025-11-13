'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Shield, Zap, Globe, TrendingUp, Lock, Users } from 'lucide-react';

export default function Home() {
  const useCases = [
    {
      title: "Crypto On/Off-Ramps & CEXes",
      description: "Trustless P2P settlement replaces exchange custody and fees. Instant, private, non-custodial.",
      timeline: "Fastest & Easiest"
    },
    {
      title: "P2P Escrow & Marketplaces",
      description: "Tickets, domains, collectibles—prove control, instant release. No marketplace middleman.",
      timeline: "Fastest & Easiest"
    },
    {
      title: "Identity & Age-Gating",
      description: "Prove \"over 18\", \"account ownership\" without data dumps. Private verification.",
      timeline: "Fastest & Easiest"
    },
    {
      title: "Enterprise Verification",
      description: "Employment, education, income attestations with selective disclosure.",
      timeline: "Fastest & Easiest"
    },
    {
      title: "Payments & Remittances",
      description: "Private, instant cross-border settlement without bank rails.",
      timeline: "Fastest & Easiest"
    },
    {
      title: "Ticketing & Memberships",
      description: "Fraud-proof primary/secondary sales with instant, private transfers.",
      timeline: "Mid-Term"
    },
    {
      title: "DePIN Verification",
      description: "Attest real-world output from provider portals; no special hardware.",
      timeline: "Mid-Term"
    },
    {
      title: "Supply Chain & Trade Finance",
      description: "Milestone proofs unlock capital. Complete transparency without intermediaries.",
      timeline: "Long-Horizon"
    },
    {
      title: "Healthcare & Life Sciences",
      description: "Credentialing, coverage eligibility, clinical data attestations.",
      timeline: "Long-Horizon"
    }
  ];
  
  return (
    <main className="flex flex-col items-center w-full">
      {/* Hero Section */}
      <section className="w-full min-h-screen flex items-center justify-center px-4 md:px-8 pt-20 md:pt-0">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-6xl mx-auto text-center"
        >
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-white mb-6 md:mb-8 leading-tight">
            The Future of
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 text-transparent bg-clip-text">
              Disintermediation
            </span>
          </h1>
          <p className="text-xl md:text-3xl text-gray-300 mb-8 md:mb-12 max-w-4xl mx-auto leading-relaxed">
            MrProve replaces middlemen with mathematical proofs.
            <br className="hidden md:block" />
            Every transaction burns tokens. Every use creates scarcity.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a 
              href="#learn-more" 
              className="group bg-white text-black px-8 py-4 rounded-full font-bold text-lg hover:bg-gray-200 transition-all duration-300 flex items-center gap-2"
            >
              Learn More
              <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
            </a>
          </div>
        </motion.div>
      </section>

      {/* Core Value Proposition */}
      <section id="learn-more" className="w-full py-20 md:py-32 px-4 md:px-8 bg-zinc-900/30">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Deflationary by Design
            </h2>
            <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto">
              MrProve never inflates. It only burns. Automatically bought and burnt every time someone uses PrivateProver technology.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Shield,
                title: "Trustless Proofs",
                description: "Replace intermediaries with mathematical certainty. No custody, no middlemen, no trust required."
              },
              {
                icon: TrendingUp,
                title: "Engineered Scarcity",
                description: "Every successful use case burns tokens from a fixed supply. Adoption directly drives scarcity."
              },
              {
                icon: Zap,
                title: "Instant Settlement",
                description: "Prove payment from bank. Prove coins sent. Settle instantly. No waiting, no escrow."
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-black border border-zinc-800 rounded-2xl p-8 hover:border-zinc-600 transition-all duration-300"
              >
                <feature.icon className="w-12 h-12 text-blue-400 mb-4" />
                <h3 className="text-2xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* The Paradigm Shift */}
      <section className="w-full py-20 md:py-32 px-4 md:px-8">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
              A New Paradigm
              </h2>
            <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto mb-12">
              Crypto was invented to remove middlemen. Exchanges became the new middlemen.
              <br className="hidden md:block" />
              MrProve brings crypto back to its original vision.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="bg-red-950/20 border border-red-900/50 rounded-2xl p-8"
            >
              <h3 className="text-3xl font-bold text-red-400 mb-6">The Old Way</h3>
              <ul className="space-y-4 text-gray-300">
                <li className="flex items-start gap-3">
                  <span className="text-red-400 mt-1">✗</span>
                  <span>Custody risk with centralized exchanges</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-400 mt-1">✗</span>
                  <span>High fees that benefit middlemen</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-400 mt-1">✗</span>
                  <span>Privacy violations and KYC requirements</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-400 mt-1">✗</span>
                  <span>Slow settlement times</span>
                </li>
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="bg-green-950/20 border border-green-900/50 rounded-2xl p-8"
            >
              <h3 className="text-3xl font-bold text-green-400 mb-6">The MrProve Way</h3>
              <ul className="space-y-4 text-gray-300">
                <li className="flex items-start gap-3">
                  <span className="text-green-400 mt-1">✓</span>
                  <span>Non-custodial, trustless settlement</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-400 mt-1">✓</span>
                  <span>Fees that burn tokens, creating scarcity</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-400 mt-1">✓</span>
                  <span>Private proofs, no data exposure</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-400 mt-1">✓</span>
                  <span>Instant, automated settlement</span>
                </li>
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section id="use-cases" className="w-full py-20 md:py-32 px-4 md:px-8 bg-zinc-900/30">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Infinite Use Cases
            </h2>
            <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto">
              Every industry with middlemen is ready for disruption.
              <br className="hidden md:block" />
              Each proof burns tokens. Each use case adds demand.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {useCases.map((useCase, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: (index % 6) * 0.05 }}
                viewport={{ once: true }}
                className="bg-black border border-zinc-800 rounded-xl p-6 hover:border-zinc-600 transition-all duration-300 group"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">
                    {useCase.title}
                  </h3>
                </div>
                <p className="text-gray-400 text-sm mb-3 leading-relaxed">{useCase.description}</p>
                <span className="text-xs text-blue-400 font-semibold uppercase tracking-wider">
                  {useCase.timeline}
                </span>
              </motion.div>
            ))}
          </div>
            </div>
      </section>

      {/* Why This Wins */}
      <section className="w-full py-20 md:py-32 px-4 md:px-8">
              <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Why This Wins
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              {
                icon: Zap,
                title: "Exchange-Killer UX",
                description: "Instant, private, non-custodial settlement that feels simpler than a wire transfer."
              },
              {
                icon: Lock,
                title: "Composability Moat",
                description: "Once wallets and dApps integrate the rail, flows compound across use cases."
              },
              {
                icon: Globe,
                title: "Multi-Vertical Demand",
                description: "Finance, identity, commerce, DePIN, enterprise—many independent engines burning the same fixed supply."
              },
              {
                icon: Shield,
                title: "Credible Neutrality",
                description: "Proofs are math. Settlement is code. No favorites, no listings, no freeze button."
              }
            ].map((reason, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-gradient-to-br from-blue-950/30 to-purple-950/30 border border-zinc-800 rounded-2xl p-8 hover:border-blue-600 transition-all duration-300"
              >
                <reason.icon className="w-12 h-12 text-blue-400 mb-4" />
                <h3 className="text-2xl font-bold text-white mb-3">{reason.title}</h3>
                <p className="text-gray-400 leading-relaxed">{reason.description}</p>
              </motion.div>
            ))}
              </div>
            </div>
      </section>

      {/* Final CTA */}
      <section className="w-full py-20 md:py-32 px-4 md:px-8 bg-gradient-to-br from-blue-950/30 via-purple-950/30 to-pink-950/30">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Amplifies Blockchains.
              <br />
              Transcends Them.
            </h2>
            <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed">
              Blockchains solved double spends. MrProve amplifies blockchain utility by removing the middlemen that made crypto so hard.
            </p>
            <p className="text-lg md:text-xl text-blue-400 font-bold mb-12">
              You are the network. You are the future.
            </p>
          </motion.div>
        </div>
      </section>
    </main>
  );
} 