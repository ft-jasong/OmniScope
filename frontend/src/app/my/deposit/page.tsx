'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { PublicKey, Connection } from '@solana/web3.js';
import { getConnection, createTransferTransaction, signAndSendTransaction, getADRTokenBalance } from '@/utils/adr-token-client';

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
      // 입금 대상 주소 (실제 프로젝트에서는 환경 변수나 설정에서 가져오는 것이 좋습니다)
      const depositAddress = new PublicKey('DepositAddressHere'); // 실제 주소로 교체 필요
      const userPublicKey = new PublicKey(account);
      const depositAmount = parseFloat(amount);

      // 트랜잭션 생성
      const transaction = await createTransferTransaction(
        connection,
        userPublicKey,
        depositAddress,
        depositAmount
      );

      // 트랜잭션 서명 및 전송
      const signature = await signAndSendTransaction(transaction);

      toast({
        title: "입금 성공",
        description: `${depositAmount} ADR 토큰이 성공적으로 입금되었습니다.`,
      });

      // 잔액 업데이트
      const newBalance = await getADRTokenBalance(connection, userPublicKey);
      setBalance(newBalance);

      // 입금 정보를 백엔드에 기록 (필요한 경우)
      await recordDeposit(account, depositAmount, signature);

      // 입력 필드 초기화
      setAmount('');
    } catch (error) {
      console.error("Deposit error:", error);
      toast({
        title: "입금 실패",
        description: "입금 처리 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Record deposit to backend
  const recordDeposit = async (walletAddress: string, amount: number, txSignature: string) => {
    try {
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

      return await response.json();
    } catch (error) {
      console.error("Backend record error:", error);
      // 백엔드 기록 실패는 사용자에게 알리지 않고 로깅만 합니다.
      // 이미 블록체인에 트랜잭션이 기록되었기 때문에 중요한 부분은 완료된 상태입니다.
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">입금하기</h1>
      
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>ADR 토큰 입금</CardTitle>
          <CardDescription>
            Phantom 지갑을 연결하고 ADR 토큰을 입금하세요.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {!isConnected ? (
            <Button 
              className="w-full" 
              onClick={connectWallet}
            >
              Phantom 지갑 연결하기
            </Button>
          ) : (
            <>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="wallet-address">지갑 주소</Label>
                <div className="p-2 border rounded-md bg-muted text-sm font-mono break-all">
                  {account}
                </div>
              </div>
              
              {balance !== null && (
                <div className="flex flex-col space-y-1.5">
                  <Label>현재 잔액</Label>
                  <div className="p-2 border rounded-md bg-muted">
                    {balance} ADR
                  </div>
                </div>
              )}
              
              <div className="flex flex-col space-y-1.5">
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
            </>
          )}
        </CardContent>
        
        <CardFooter className="flex flex-col space-y-2">
          {isConnected && (
            <>
              <Button 
                className="w-full" 
                onClick={handleDeposit}
                disabled={isLoading || !amount}
              >
                {isLoading ? "처리 중..." : "입금하기"}
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={disconnectWallet}
              >
                지갑 연결 해제
              </Button>
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}