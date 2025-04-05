'use client';

import Link from 'next/link';
import { ArrowRight, Key, LineChart, Coins, Database } from 'lucide-react';
import { useSDK } from '@metamask/sdk-react';
import Image from 'next/image';

export default function Home() {
  const { connected } = useSDK();

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white/80">
      <main className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <Image
            src="/logo-500.png" 
            alt="OmniScope Logo" 
            className="w-32 h-32 mx-auto mb-6"
            width={128}
            height={128}
          />
          <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-[#9945FF] to-[#14F195] text-transparent bg-clip-text mb-6">
            OmniScope
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            An ADR Chain-based tokenized API platform providing real-time crypto data for Al agents.
          </p>
          <Link
            href={connected ? "/hot" : "/my/profile"}
            className="inline-flex items-center bg-[#9945FF] hover:bg-[#8A3EE8] text-white px-8 py-4 text-lg font-semibold rounded-lg transition-colors"
          >
            {connected ? 'Explore Hot APIs' : 'Get Started'} <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="bg-white rounded-lg p-6 border border-[rgba(0,0,0,0.08)] hover:shadow-md transition-all">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-[rgba(153,69,255,0.1)] rounded-lg mr-3">
                <Key className="w-8 h-8 text-[#9945FF]" />
              </div>
              <h3 className="text-xl font-semibold text-gray-700">Token-Gated Access</h3>
            </div>
            <p className="text-gray-600">
              Lock in your ADR tokens to unlock private API keys and start building securely
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 border border-[rgba(0,0,0,0.08)] hover:shadow-md transition-all">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-[rgba(153,69,255,0.1)] rounded-lg mr-3">
                <LineChart className="w-8 h-8 text-[#9945FF]" />
              </div>
              <h3 className="text-xl font-semibold text-gray-700">Live Market Feeds</h3>
            </div>
            <p className="text-gray-600">
              Tap into real-time crypto data for smarter AI models and automated trading flows
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 border border-[rgba(0,0,0,0.08)] hover:shadow-md transition-all">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-[rgba(153,69,255,0.1)] rounded-lg mr-3">
                <Coins className="w-8 h-8 text-[#9945FF]" />
              </div>
              <h3 className="text-xl font-semibold text-gray-700">Usage-Based Pricing</h3>
            </div>
            <p className="text-gray-600">
              Only pay for what you use — no flat fees, no surprises
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 border border-[rgba(0,0,0,0.08)] hover:shadow-md transition-all">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-[rgba(153,69,255,0.1)] rounded-lg mr-3">
                <LineChart className="w-8 h-8 text-[#9945FF]" />
              </div>
              <h3 className="text-xl font-semibold text-gray-700">Smart API Insights</h3>
            </div>
            <p className="text-gray-600">
              Monitor usage, track performance, and stay on top of your API spend
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 border border-[rgba(0,0,0,0.08)] hover:shadow-md transition-all">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-[rgba(153,69,255,0.1)] rounded-lg mr-3">
                <Key className="w-8 h-8 text-[#9945FF]" />
              </div>
              <h3 className="text-xl font-semibold text-gray-700">Key Control Center</h3>
            </div>
            <p className="text-gray-600">
              Generate and manage API keys with fine-tuned rate limits
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 border border-[rgba(0,0,0,0.08)] hover:shadow-md transition-all">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-[rgba(153,69,255,0.1)] rounded-lg mr-3">
                <Database className="w-8 h-8 text-[#9945FF]" />
              </div>
              <h3 className="text-xl font-semibold text-gray-700">Powerful API Suite</h3>
            </div>
            <p className="text-gray-600">
              Explore a range of APIs covering market data, sentiment signals, and blockchain metrics
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
