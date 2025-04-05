'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Button } from './ui/button';
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
  const { account, setAccount } = useWallet();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  const [isWalletConnected, setIsWalletConnected] = useState(false);

  // Initialize wallet connection
  useEffect(() => {
    const initializeWallet = async () => {
      try {
        if (typeof window.phantom?.solana !== 'undefined') {
          const provider = window.phantom.solana;
          if (provider.isConnected) {
            const { publicKey } = await provider.connect();
            setAccount(publicKey.toString());
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

      if (typeof window.phantom?.solana === 'undefined') {
        throw new Error('Please install Phantom!');
      }

      const provider = window.phantom.solana;
      const { publicKey } = await provider.connect();
      const newAccount = publicKey.toString();
      
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

      // Sign the message using Phantom
      const message = new TextEncoder().encode(nonceData.message);
      const { signature } = await provider.signMessage(message, 'utf8');

      // Verify signature with backend
      const verifyResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet_address: newAccount,
          signature: Buffer.from(signature).toString('base64')
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
      if (typeof window.phantom?.solana !== 'undefined') {
        await window.phantom.solana.disconnect();
      }
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