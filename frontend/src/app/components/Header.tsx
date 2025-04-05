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
    <header className="backdrop-blur-xl bg-white/80 border-b border-[rgba(0,0,0,0.08)]">
      <div className="mx-auto px-4">
        <div className="flex justify-between items-center h-14 sm:h-16">
          <div className="flex-1 flex items-center">
            <Link href="/" className="flex items-center hover:opacity-90 transition-opacity">
              <span className="bg-gradient-to-r from-[#9945FF] via-[#00D1FF] to-[#14F195] text-transparent bg-clip-text text-lg sm:text-xl font-bold">OmniScope</span>
            </Link>
          </div>
          {connected ? (
            <Button 
              onClick={disconnect}
              variant="outline"
              size="sm"
              className="bg-white/80 border-[rgba(0,0,0,0.08)] text-gray-700 hover:bg-gray-50"
            >
              {formatAddress(account)} <Image src="/MetaMask_Fox.svg" alt="MetaMask Fox" className="inline-block w-4 h-4 ml-2" width={20} height={20} />
            </Button>
          ) : (
            <Button 
              onClick={connect}
              disabled={connecting}
              variant="default"
              size="sm"
            >
              {connecting ? 'Connecting...' : 'Connect Wallet'} <Image src="/MetaMask_Fox.svg" alt="MetaMask Fox" className="inline-block w-4 h-4 ml-2" width={20} height={20} />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
} 