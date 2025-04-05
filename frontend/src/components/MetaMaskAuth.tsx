'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useSDK } from '@metamask/sdk-react';
import type Web3 from 'web3';

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
  }
}

export default function MetaMaskAuth() {
  const { sdk } = useSDK();
  const [account, setAccount] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  const [isMetaMaskConnected, setIsMetaMaskConnected] = useState(false);

  // Function to check MetaMask connection
  const checkMetaMaskConnection = async () => {
    try {
      if (typeof window.ethereum !== 'undefined') {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (Array.isArray(accounts) && accounts.length > 0) {
          setIsMetaMaskConnected(true);
          setAccount(accounts[0] as string);
        } else {
          setIsMetaMaskConnected(false);
          setAccount(null);
        }
      }
    } catch (err) {
      console.error('Error checking MetaMask connection:', err);
      setIsMetaMaskConnected(false);
      setAccount(null);
    }
  };

  // Function to handle account changes
  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) {
      setIsMetaMaskConnected(false);
      setAccount(null);
      localStorage.removeItem('authToken');
      localStorage.removeItem('account');
      localStorage.removeItem('tokenBalance');
    } else {
      setIsMetaMaskConnected(true);
      setAccount(accounts[0]);
    }
  };

  // Check for existing session and MetaMask connection on mount
  useEffect(() => {
    const checkExistingSession = async () => {
      const storedAccount = localStorage.getItem('account');
      const storedToken = localStorage.getItem('authToken');
      const storedBalance = localStorage.getItem('tokenBalance');

      if (storedAccount && storedToken) {
        setAccount(storedAccount);
        if (storedBalance) {
          setTokenBalance(Number(storedBalance));
        }
      }

      // Check MetaMask connection
      await checkMetaMaskConnection();

      // Set up event listeners
      if (typeof window.ethereum !== 'undefined') {
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', () => window.location.reload());
      }

      // Cleanup function
      return () => {
        if (typeof window.ethereum !== 'undefined') {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', () => window.location.reload());
        }
      };
    };

    checkExistingSession();
  }, []);

  const connectAndLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (typeof window.ethereum === 'undefined') {
        throw new Error('Please install MetaMask!');
      }

      // 1. Connect MetaMask
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (!Array.isArray(accounts) || accounts.length === 0) {
        throw new Error('No accounts found');
      }
      const newAccount = accounts[0] as string;
      setAccount(newAccount);
      setIsMetaMaskConnected(true);
      localStorage.setItem('account', newAccount);

      // 2. Get nonce from backend
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

      // 3. Sign the message using MetaMask
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [nonceData.message, newAccount]
      }) as string;

      // 4. Verify signature with backend
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
      
      // 5. Store the token and update balance
      localStorage.setItem('authToken', verifyData.access_token);
      if (verifyData.token_balance !== undefined) {
        localStorage.setItem('tokenBalance', verifyData.token_balance.toString());
        setTokenBalance(verifyData.token_balance);
      }
    } catch (err) {
      console.error('Connect and login error:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect and login');
      setIsMetaMaskConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await sdk?.disconnect();
      setAccount(null);
      setTokenBalance(null);
      setIsMetaMaskConnected(false);
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
        <div className="mb-6 p-4 bg-red-900/50 rounded-lg">
          <p className="text-red-200">{error}</p>
        </div>
      )}

      {isMetaMaskConnected && account && (
        <div className="mb-6 p-4 bg-green-900/50 rounded-lg max-w-md mx-auto">
          <div className="flex items-center space-x-2">
            <div className="relative">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div className="absolute inset-0 w-2 h-2 bg-green-500 rounded-full animate-ping opacity-75"></div>
            </div>
            <h3 className="text-green-200 font-medium">Connected Account</h3>
          </div>
          <p className="text-sm text-green-300 mt-1">{account}</p>
          {tokenBalance !== null && (
            <p className="text-sm text-green-300 mt-1">HSK Balance: {tokenBalance}</p>
          )}
        </div>
      )}

      <section className="space-y-4 max-w-md mx-auto">
        {!isMetaMaskConnected ? (
          <button
            onClick={connectAndLogin}
            disabled={loading}
            className="w-full flex items-center justify-center px-4 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Image src="/MetaMask_Fox.svg" alt="MetaMask Fox" className="w-6 h-6 mr-2" width={24} height={24} />
            {loading ? 'Connecting...' : 'Connect & Login with Wallet'}
          </button>
        ) : (
          <button
            onClick={logout}
            disabled={loading}
            className="w-full flex items-center justify-center px-4 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Image src="/MetaMask_Fox.svg" alt="MetaMask Fox" className="w-6 h-6 mr-2" width={24} height={24} />
            Logout
          </button>
        )}
      </section>
    </div>
  );
} 