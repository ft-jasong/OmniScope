'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Coins, ArrowRight } from 'lucide-react';

interface TierInfo {
  name: string;
  color: string;
  price: number;
  rateLimit: number;
  minBalance: number;
  description: string;
}

const tiers: TierInfo[] = [
  {
    name: 'Gold',
    color: 'from-[#FFD700] via-[#FFA500] to-[#FF8C00]',
    price: 50,
    rateLimit: 1000,
    minBalance: 10000,
    description: 'Best for high-volume traders and professional users'
  },
  {
    name: 'Silver',
    color: 'from-[#C0C0C0] via-[#A9A9A9] to-[#808080]',
    price: 70,
    rateLimit: 500,
    minBalance: 5000,
    description: 'Perfect for active traders and regular users'
  },
  {
    name: 'Bronze',
    color: 'from-[#CD7F32] via-[#B87333] to-[#8B4513]',
    price: 100,
    rateLimit: 100,
    minBalance: 0,
    description: 'Great for getting started with basic features'
  }
];

export default function UpgradePage() {
  const [tokenBalance, setTokenBalance] = useState<string>('0');
  const [currentTier, setCurrentTier] = useState<string>('Bronze');
  const [account, setAccount] = useState<string | null>(null);

  useEffect(() => {
    checkConnection();
    
    // Account change event listener
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        setAccount(accounts[0]);
        if (accounts[0]) {
          fetchUserBalance(accounts[0]);
        }
      });
    }
    
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', () => {});
      }
    };
  }, []);

  const checkConnection = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' }) as string[];
        setAccount(accounts[0]);
        if (accounts[0]) {
          await fetchUserBalance(accounts[0]);
        }
      } catch (error) {
        console.error('Connection error:', error);
      }
    }
  };

  const fetchUserBalance = async (userAddress: string) => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/users/${userAddress}/balance`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch balance");
      }

      const data = await response.json();
      setTokenBalance(data.formatted_balance || '0');
      
      // Determine current tier based on balance
      const balance = parseFloat(data.formatted_balance || '0');
      if (balance >= 10000) {
        setCurrentTier('Gold');
      } else if (balance >= 5000) {
        setCurrentTier('Silver');
      } else if (balance >= 1000) {
        setCurrentTier('Bronze');
      }
    } catch (error) {
      console.error('Balance fetch error:', error);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white/80 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-semibold mb-8 bg-gradient-to-r from-[#9945FF] via-[#00D1FF] to-[#14F195] text-transparent bg-clip-text">
          Usage Tiers
        </h1>
        
        {/* Tier Boxes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative bg-gradient-to-br from-[rgba(255,255,255,0.9)] to-[rgba(255,255,255,0.7)] backdrop-blur-xl border border-[rgba(0,0,0,0.08)] rounded-lg p-6 shadow-sm transform transition-all hover:scale-105 ${
                currentTier === tier.name ? 'ring-2 ring-[#9945FF]' : ''
              }`}
            >
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <div className={`bg-gradient-to-r ${tier.color} text-white px-4 py-1 rounded-full text-sm font-semibold`}>
                  {tier.name}
                </div>
              </div>
              <div className="mt-4">
                <h3 className={`text-xl font-bold mb-4 bg-gradient-to-r ${tier.color} text-transparent bg-clip-text`}>
                  {tier.name} Tier
                </h3>
                <div className="space-y-3">
                  <p className="flex justify-between text-gray-600">
                    <span>Usage Fee:</span>
                    <span className="font-semibold text-gray-700">{tier.price}%</span>
                  </p>
                  <p className="flex justify-between text-gray-600">
                    <span>Request Limit:</span>
                    <span className="font-semibold text-gray-700">{tier.rateLimit}/min</span>
                  </p>
                  <p className="flex justify-between text-gray-600">
                    <span>Min Balance:</span>
                    <span className="font-semibold text-gray-700">{tier.minBalance}</span>
                  </p>
                </div>
                <p className="mt-4 text-sm text-gray-500">{tier.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* User Balance Section */}
        <div className="bg-gradient-to-br from-[rgba(255,255,255,0.9)] to-[rgba(255,255,255,0.7)] backdrop-blur-xl border border-[rgba(0,0,0,0.08)] rounded-lg p-6 mb-8 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-700 mb-2">Your Current Balance</h2>
              <div className="flex items-center space-x-2">
                <Coins className="w-6 h-6 text-[#9945FF]" />
                <span className="text-2xl font-bold text-gray-700">
                  {account ? `${tokenBalance}` : 'Connect Wallet'}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-gray-500">Current Tier</p>
              <span className="text-xl font-bold bg-gradient-to-r from-[#9945FF] via-[#00D1FF] to-[#14F195] text-transparent bg-clip-text">
                {currentTier}
              </span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="text-center">
          <Link
            href="/my/deposit"
            className="inline-flex items-center bg-gradient-to-r from-[#9945FF] via-[#00D1FF] to-[#14F195] hover:from-[#8a3de8] hover:via-[#00b8e6] hover:to-[#12d985] text-white px-8 py-4 text-lg font-semibold rounded-lg transition-all hover:shadow-lg"
          >
            Deposit and upgrade your tier now
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        </div>
      </div>
    </div>
  );
} 