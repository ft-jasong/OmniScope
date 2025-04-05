'use client';

import React from 'react';
import Image from 'next/image';
import { useSDK } from '@metamask/sdk-react';
import { formatAddress } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Link from "next/link"

export default function Header() {
  const { sdk, connected, connecting, account } = useSDK();

  const connect = async () => {
    try {
      const accounts = await sdk?.connect() as string[];
      if (!accounts?.[0]) throw new Error('No accounts found');
    } catch (err) {
      console.warn(`No accounts found`, err);
    }
  };

  const disconnect = async () => {
    try {
      await sdk?.disconnect();
    } catch (err) {
      console.warn(`Failed to disconnect`, err);
    }
  };

  return (
    <header className="bg-gray-800 border-b border-gray-200">
      <div className="mx-auto px-4">
        <div className="flex justify-between items-center h-14 sm:h-16">
          <div className="flex-1 flex items-center">
            <Link href="/" className="flex items-center hover:opacity-90 transition-opacity">
              <span className="text-gray-100 text-lg sm:text-xl font-semibold">HashScope</span>
            </Link>
          </div>
          {connected ? (
            <Button 
              onClick={disconnect}
              className="flex items-center justify-center bg-red-50 text-red-600 px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base rounded-md hover:bg-red-100 transition-colors"
            >
              {formatAddress(account)} (Disconnect) <Image src="/MetaMask_Fox.svg" alt="MetaMask Fox" className="inline-block w-4 h-4 ml-2" width={20} height={20} />
            </Button>
          ) : (
            <Button 
              onClick={connect}
              disabled={connecting}
              className="flex items-center justify-center bg-blue-600 text-white px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:hover:bg-blue-600"
            >
              {connecting ? 'Connecting...' : 'Connect Wallet'} <Image src="/MetaMask_Fox.svg" alt="MetaMask Fox" className="inline-block w-4 h-4 ml-2" width={20} height={20} />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
} 