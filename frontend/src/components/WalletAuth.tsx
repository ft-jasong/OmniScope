'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useSDK } from '@metamask/sdk-react';
import { Button } from './ui/button';
import type Web3 from 'web3';
import { useWallet } from '@/contexts/WalletContext';

interface NonceResponse {
  wallet_address: string;
  nonce: string;
  message: string;
}

interface VerifyResponse {
  access_token: string;
  token_type: string;
  wallet_address: string;
  token_balance: number;
}

interface ValidationError {
  detail: Array<{
    loc: string[];
    msg: string;
    type: string;
  }>;
}

declare global {
  interface Window {
    web3: Web3;
    ethereum: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      isConnected: () => boolean;
      on: (eventName: string, callback: (accounts: string[]) => void) => void;
      removeListener: (eventName: string, callback: (accounts: string[]) => void) => void;
    };
    phantom?: {
      solana: {
        connect: () => Promise<{ publicKey: { toString: () => string } }>;
        signMessage: (message: Uint8Array, encoding: string) => Promise<{ signature: Uint8Array }>;
        isConnected: boolean;
        on: (event: string, callback: () => void) => void;
        disconnect: () => Promise<void>;
      };
    };
  }
}

export default function WalletAuth() {
  const { sdk } = useSDK();
  const { account, setAccount } = useWallet();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  const [isWalletConnected, setIsWalletConnected] = useState(false);

  // Initialize wallet connection
  useEffect(() => {
    const initializeWallet = async () => {
      try {
        // Check MetaMask first
        if (typeof window.ethereum !== 'undefined') {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (Array.isArray(accounts) && accounts.length > 0) {
            setAccount(accounts[0]);
            setIsWalletConnected(true);
            return;
          }
        }

        // Check localStorage for existing session
        const storedAccount = localStorage.getItem('account');
        const storedToken = localStorage.getItem('authToken');
        const storedBalance = localStorage.getItem('tokenBalance');

        if (storedAccount && storedToken) {
          setAccount(storedAccount);
          if (storedBalance) {
            setTokenBalance(Number(storedBalance));
          }
          setIsWalletConnected(true);
        }
      } catch (err) {
        console.error('Error initializing wallet:', err);
      }
    };

    initializeWallet();
  }, [setAccount]);

  const connectPhantom = async () => {
    try {
      setLoading(true);
      setError(null);

      if (typeof window.ethereum === 'undefined') {
        throw new Error('Please install MetaMask!');
      }

      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (!Array.isArray(accounts) || accounts.length === 0) {
        throw new Error('No accounts found');
      }

      const newAccount = accounts[0] as string;
      
      // Get nonce from backend
      const nonceResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/nonce`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet_address: newAccount
        }),
      });

      if (!nonceResponse.ok) {
        const errorData: ValidationError = await nonceResponse.json();
        throw new Error(errorData.detail[0]?.msg || 'Failed to get nonce');
      }

      const nonceData: NonceResponse = await nonceResponse.json();

      // Sign the message using MetaMask
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [nonceData.message, newAccount]
      }) as string;

      // Verify signature with backend
      const verifyResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet_address: newAccount,
          signature: signature
        }),
      });

      if (!verifyResponse.ok) {
        const errorData: ValidationError = await verifyResponse.json();
        throw new Error(errorData.detail[0]?.msg || 'Failed to verify signature');
      }

      const verifyData: VerifyResponse = await verifyResponse.json();
      
      // Update state and localStorage
      setAccount(newAccount);
      setIsWalletConnected(true);
      localStorage.setItem('account', newAccount);
      localStorage.setItem('authToken', verifyData.access_token);
      if (verifyData.token_balance !== undefined) {
        localStorage.setItem('tokenBalance', verifyData.token_balance.toString());
        setTokenBalance(verifyData.token_balance);
      }
    } catch (err) {
      console.error('Wallet connection error:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect with wallet');
      setIsWalletConnected(false);
      setAccount(null);
      localStorage.removeItem('account');
      localStorage.removeItem('authToken');
      localStorage.removeItem('tokenBalance');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await sdk?.disconnect();
      setAccount(null);
      setTokenBalance(null);
      setIsWalletConnected(false);
      localStorage.removeItem('authToken');
      localStorage.removeItem('account');
      localStorage.removeItem('tokenBalance');
    } catch (err) {
      console.warn(`Failed to disconnect`, err);
      setError('Failed to disconnect');
    }
  };

  return (
    <div className="w-full">
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {isWalletConnected && account && (
        <div className="mb-6 p-4 bg-gradient-to-r from-[rgba(153,69,255,0.05)] to-[rgba(20,241,149,0.05)] backdrop-blur-xl rounded-lg border border-[rgba(0,0,0,0.08)] max-w-md mx-auto">
          <div className="flex items-center space-x-2">
            <div className="relative">
              <div className="w-2 h-2 bg-[#14F195] rounded-full"></div>
              <div className="absolute inset-0 w-2 h-2 bg-[#14F195] rounded-full animate-ping opacity-75"></div>
            </div>
            <h3 className="text-gray-700 font-medium">Connected Account</h3>
          </div>
          <p className="text-sm text-gray-600 mt-1">{account}</p>
          {tokenBalance !== null && (
            <p className="text-sm text-gray-600 mt-1">ADR Balance: {tokenBalance}</p>
          )}
        </div>
      )}

      <section className="space-y-4 max-w-md mx-auto">
        {!isWalletConnected ? (
          <Button
            onClick={connectPhantom}
            disabled={loading}
            className="w-full hover:cursor-pointer"
          >
            <Image src="/phantom.svg" alt="Phantom" className="w-6 h-6 mr-2" width={24} height={24} />
            {loading ? 'Connecting...' : 'Connect with Phantom'}
          </Button>
        ) : (
          <Button
            onClick={logout}
            disabled={loading}
            variant="outline"
            className="w-full hover:cursor-pointer text-gray-700 hover:bg-gray-100"
          >
            <Image src="/phantom.svg" alt="Phantom" className="w-6 h-6" width={24} height={24} />
            Logout
          </Button>
        )}
      </section>
    </div>
  );
} 