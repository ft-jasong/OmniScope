'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { PublicKey, Connection } from '@solana/web3.js';
import { getConnection, createTransferTransaction, signAndSendTransaction, getADRTokenBalance, stakeTokens } from '@/utils/adr-token-client';

// Phantom wallet event types
type PhantomEvent = 'connect' | 'disconnect' | 'accountChanged'
type PhantomEventCallback = (publicKey: string | null | undefined) => void

export default function DepositPage() {
  const [amount, setAmount] = useState<string>('');
  const [account, setAccount] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const { toast } = useToast();
  const router = useRouter();
  const [connection, setConnection] = useState<Connection | null>(null);

  // Initialize connection
  useEffect(() => {
    const conn = getConnection('devnet'); // 'devnet', 'testnet', or 'mainnet-beta'
    setConnection(conn);
  }, []);

  // Check wallet connection
  const checkConnection = useCallback(async () => {
    const phantom = window.phantom?.solana;
    if (!phantom) {
      toast({
        title: "Phantom 지갑을 찾을 수 없습니다",
        description: "Phantom 지갑 확장 프로그램을 설치해주세요.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Try to connect to get the public key
      const { publicKey } = await phantom.connect();
      const address = publicKey.toString();
      setAccount(address);
      setIsConnected(true);

      // Get balance if connection is available
      if (connection) {
        const userPublicKey = new PublicKey(address);
        const userBalance = await getADRTokenBalance(connection, userPublicKey);
        setBalance(userBalance);
      }
    } catch (error) {
      console.error("Connection error:", error);
      setIsConnected(false);
    }
  }, [toast, connection]);

  // Connect wallet
  const connectWallet = async () => {
    const phantom = window.phantom?.solana;
    if (!phantom) {
      toast({
        title: "Phantom 지갑을 찾을 수 없습니다",
        description: "Phantom 지갑 확장 프로그램을 설치해주세요.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { publicKey } = await phantom.connect();
      const address = publicKey.toString();
      setAccount(address);
      setIsConnected(true);

      // Get balance if connection is available
      if (connection) {
        const userPublicKey = new PublicKey(address);
        const userBalance = await getADRTokenBalance(connection, userPublicKey);
        setBalance(userBalance);
      }

      toast({
        title: "지갑 연결 성공",
        description: `${address.substring(0, 6)}...${address.substring(address.length - 4)}에 연결되었습니다.`,
      });
    } catch (error) {
      console.error("Connection error:", error);
      toast({
        title: "지갑 연결 실패",
        description: "Phantom 지갑 연결 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  // Disconnect wallet
  const disconnectWallet = async () => {
    const phantom = window.phantom?.solana;
    if (phantom) {
      try {
        await phantom.disconnect();
        setAccount(null);
        setIsConnected(false);
        setBalance(null);
        toast({
          title: "지갑 연결 해제",
          description: "Phantom 지갑 연결이 해제되었습니다.",
        });
      } catch (error) {
        console.error("Disconnect error:", error);
      }
    }
  };

  // Handle account change
  useEffect(() => {
    const handleAccountChange: PhantomEventCallback = (publicKey) => {
      if (publicKey) {
        setAccount(publicKey);
        if (connection) {
          getADRTokenBalance(connection, new PublicKey(publicKey))
            .then(balance => setBalance(balance))
            .catch(error => console.error("Balance fetch error:", error));
        }
      } else {
        setAccount(null);
        setBalance(null);
      }
    };

    const phantom = window.phantom?.solana;
    if (phantom) {
      // Set up listener for account changes
      phantom.on('accountChanged', handleAccountChange);
      
      // Check initial connection
      checkConnection();
      
      // Clean up listener
      return () => {
        phantom.off('accountChanged', handleAccountChange);
      };
    }
  }, [checkConnection, connection]);

  // Handle deposit
  const handleDeposit = async () => {
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      toast({
        title: "유효하지 않은 금액",
        description: "유효한 금액을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    if (!account || !connection) {
      toast({
        title: "지갑 연결 필요",
        description: "먼저 Phantom 지갑을 연결해주세요.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // 사용자 공개키 생성
      const userPublicKey = new PublicKey(account);
      const depositAmount = parseFloat(amount);

      // 스테이킹 트랜잭션 생성 및 전송
      const signature = await stakeTokens(
        connection,
        userPublicKey,
        depositAmount
      );

      toast({
        title: "입금 성공",
        description: `${depositAmount} ADR 토큰이 성공적으로 스테이킹되었습니다.`,
      });

      // 잔액 업데이트
      const newBalance = await getADRTokenBalance(connection, userPublicKey);
      setBalance(newBalance);

      // 입금 정보를 백엔드에 기록 (필요한 경우)
      await recordDeposit(account, depositAmount, signature);

      // 입력 필드 초기화
      setAmount('');
    } catch (error: any) {
      console.error("Deposit error:", error);
      toast({
        title: "입금 실패",
        description: error.message || "입금 처리 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Record deposit to backend
  const recordDeposit = async (walletAddress: string, amount: number, txSignature: string) => {
    try {
      // 백엔드 API 엔드포인트가 설정되어 있지 않을 경우 로그만 남김
      if (!process.env.NEXT_PUBLIC_API_BASE_URL) {
        console.log('백엔드 API 엔드포인트가 설정되지 않았습니다. 입금 기록을 백엔드에 저장하지 않습니다.');
        console.log('입금 정보:', { wallet_address: walletAddress, amount, transaction_signature: txSignature });
        return;
      }
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/deposits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet_address: walletAddress,
          amount: amount,
          transaction_signature: txSignature,
          blockchain: 'solana',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to record deposit');
      }
    } catch (error) {
      console.error("Record deposit error:", error);
      // 백엔드 기록 실패는 사용자에게 표시하지 않음 (이미 입금은 성공했기 때문)
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">ADR 토큰 입금</h1>
      
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>입금하기</CardTitle>
            <CardDescription>
              ADR 토큰을 스테이킹하여 서비스를 이용하세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!isConnected ? (
              <Button onClick={connectWallet} className="w-full mb-4">
                Phantom 지갑 연결하기
              </Button>
            ) : (
              <>
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">연결된 지갑</span>
                    <Button variant="outline" size="sm" onClick={disconnectWallet}>
                      연결 해제
                    </Button>
                  </div>
                  <div className="p-3 bg-muted rounded-md text-sm font-mono break-all">
                    {account}
                  </div>
                </div>
                
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">현재 잔액</span>
                    <span className="text-sm font-medium">{balance !== null ? `${balance} ADR` : '로딩 중...'}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary" 
                      style={{ width: `${Math.min((balance || 0) / 100 * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">입금 금액 (ADR)</Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
              </>
            )}
          </CardContent>
          <CardFooter>
            {isConnected && (
              <Button 
                onClick={handleDeposit} 
                className="w-full" 
                disabled={isLoading || !amount}
              >
                {isLoading ? "처리 중..." : "입금하기"}
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}