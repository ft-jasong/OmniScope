'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Button } from './ui/button';
import { useWallet } from '@/contexts/WalletContext';
import { PublicKey } from '@solana/web3.js';

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

// Phantom wallet event types
type PhantomEvent = 'connect' | 'disconnect' | 'accountChanged'
type PhantomEventCallback = (publicKey: string | undefined) => void

// Solana wallet type - make sure this is identical across all files
declare global {
  interface Window {
    phantom?: {
      solana?: {
        isPhantom: boolean;
        connect: () => Promise<{ publicKey: PublicKey }>;
        disconnect: () => Promise<void>;
        on: (event: PhantomEvent, callback: PhantomEventCallback) => void;
        off: (event: PhantomEvent, callback: PhantomEventCallback) => void;
        request: (args: { method: string; params: Record<string, unknown> }) => Promise<string>;
      }
    }
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
    checkWalletConnection();
    
    // Check if token exists in local storage
    const token = localStorage.getItem('authToken');
    if (token && account) {
      fetchUserBalance(account);
    }
  }, [account]);

  const checkWalletConnection = async () => {
    try {
      const phantom = window.phantom?.solana;
      if (!phantom) return null;
      
      try {
        const { publicKey } = await phantom.connect();
        const address = publicKey.toString();
        setAccount(address);
        setIsWalletConnected(true);
        return address;
      } catch (error) {
        // If connect fails, the wallet is not connected
        return null;
      }
    } catch (error) {
      console.error('Failed to check wallet connection:', error);
      return null;
    }
  };

  const connectWallet = async () => {
    setError(null);
    setLoading(true);
    
    try {
      const phantom = window.phantom?.solana;
      if (!phantom) {
        throw new Error('Phantom wallet not found! Please install it from https://phantom.app/');
      }
      
      const { publicKey } = await phantom.connect();
      const address = publicKey.toString();
      setAccount(address);
      setIsWalletConnected(true);
      
      // Get authentication nonce
      await getNonceAndAuthenticate(address);
      
    } catch (error) {
      console.error('Wallet connection error:', error);
      setError(error instanceof Error ? error.message : 'Failed to connect wallet');
    } finally {
      setLoading(false);
    }
  };
  
  const disconnectWallet = async () => {
    try {
      const phantom = window.phantom?.solana;
      if (phantom) {
        await phantom.disconnect();
      }
      
      // Clear local auth data
      localStorage.removeItem('authToken');
      setAccount(null);
      setIsWalletConnected(false);
      setTokenBalance(null);
      
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  };

  const getNonceAndAuthenticate = async (address: string) => {
    try {
      // Get nonce from server
      const nonceResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/nonce/${address}`);
      
      if (!nonceResponse.ok) {
        if (nonceResponse.status === 400) {
          const errorData = await nonceResponse.json() as ValidationError;
          throw new Error(errorData.detail[0]?.msg || 'Invalid request');
        }
        throw new Error('Failed to get authentication nonce');
      }
      
      const nonceData = await nonceResponse.json() as NonceResponse;
      
      // Sign the message with wallet
      const messageBytes = new TextEncoder().encode(nonceData.message);
      const phantom = window.phantom?.solana;
      
      if (!phantom) {
        throw new Error('Wallet disconnected');
      }
      
      // Use request method to sign message
      const signature = await phantom.request({
        method: 'signMessage',
        params: {
          message: messageBytes,
          display: 'utf8'
        }
      });
      
      // Convert signature to base64
      const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(Buffer.from(signature, 'hex'))));
      
      // Verify signature with server
      const verifyResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet_address: address,
          signature: signatureBase64,
          nonce: nonceData.nonce,
        }),
      });
      
      if (!verifyResponse.ok) {
        if (verifyResponse.status === 400) {
          const errorData = await verifyResponse.json() as ValidationError;
          throw new Error(errorData.detail[0]?.msg || 'Verification failed');
        }
        throw new Error('Authentication failed');
      }
      
      const verifyData = await verifyResponse.json() as VerifyResponse;
      
      // Store token in local storage
      localStorage.setItem('authToken', verifyData.access_token);
      
      // Set token balance
      setTokenBalance(verifyData.token_balance);
      
    } catch (error) {
      console.error('Authentication error:', error);
      setError(error instanceof Error ? error.message : 'Authentication failed');
      throw error;
    }
  };
  
  const fetchUserBalance = async (walletAddress: string) => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/users/${walletAddress}/balance`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch balance');
      }
      
      const data = await response.json();
      setTokenBalance(data.token_balance || 0);
      
    } catch (error) {
      console.error('Balance fetch error:', error);
    }
  };

  return (
    <div className="flex flex-col items-center">
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}
      
      {!account ? (
        <Button 
          onClick={connectWallet} 
          disabled={loading}
          className="flex items-center gap-2"
        >
          {loading ? 'Connecting...' : 'Connect Wallet'}
          <Image src="/phantom.svg" alt="Phantom" width={20} height={20} />
        </Button>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <div className="text-sm font-medium">
            {account.substring(0, 6)}...{account.substring(account.length - 4)}
          </div>
          
          {tokenBalance !== null && (
            <div className="text-xs text-gray-600 mb-2">
              Balance: {tokenBalance} SOL
            </div>
          )}
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={disconnectWallet}
          >
            Disconnect
          </Button>
        </div>
      )}
    </div>
  );
}