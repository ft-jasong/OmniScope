'use client';

import { SidebarTrigger } from "@/components/ui/sidebar"
import Image from 'next/image';
import { useSDK } from '@metamask/sdk-react';
import { formatAddress } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Link from "next/link";
import { Coins } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Skeleton } from "@/components/ui/skeleton";

export function TopBar() {
  const { connected, account } = useSDK();
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (connected && account) {
      fetchUserBalance(account);
    } else {
      setTokenBalance(null);
      setIsLoading(false);
    }
  }, [connected, account]);

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
      
      if (data.formatted_balance) {
        // Handle both string and number formats
        const balance = typeof data.formatted_balance === 'string' 
          ? parseFloat(data.formatted_balance.replace(/,/g, ''))
          : data.formatted_balance;
        
        setTokenBalance(isNaN(balance) ? 0 : balance);
      } else {
        setTokenBalance(0);
      }
    } catch (error) {
      console.error('Balance fetch error:', error);
      setTokenBalance(0);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="sticky top-0 z-20 bg-gray-800 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-full items-center justify-between p-4 bg-gray-800">
        <div className="flex items-center">
          <SidebarTrigger className="bg-gray-800 text-white mr-4" />
          <Link href="/" className="flex items-center hover:opacity-90 transition-opacity">
            <span className="text-gray-100 text-lg sm:text-xl font-semibold">HashScope</span>
          </Link>
        </div>
        <div className="flex items-center space-x-4">
          {connected && (
            <div className="flex items-center space-x-2 bg-gray-700 px-3 py-1.5 rounded-lg">
              <Coins className="w-4 h-4 text-yellow-400" />
              <span className="text-white font-medium">
                {isLoading ? (
                  <Skeleton className="h-4 w-16 bg-gray-600" />
                ) : (
                  `${tokenBalance || '0'} HSK`
                )}
              </span>
            </div>
          )}
          {isLoading ? (
            <Skeleton className="h-9 w-[120px] bg-gray-700" />
          ) : (
            <Button 
              asChild
              className="flex items-center justify-center bg-blue-600 text-white px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base rounded-md hover:bg-blue-700 transition-colors"
            >
              <Link href="/my/profile">
                {connected ? (
                  <>
                    {formatAddress(account)} <Image src="/MetaMask_Fox.svg" alt="MetaMask Fox" className="inline-block w-4 h-4 ml-2" width={20} height={20} />
                  </>
                ) : (
                  'Sign In'
                )}
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
} 