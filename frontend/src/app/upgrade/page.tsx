'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PublicKey, Connection } from '@solana/web3.js';
import { getConnection, getADRTokenBalance, createTransferTransaction, signAndSendTransaction } from '@/utils/adr-token-client';

// 구독 티어 정의
const TIERS = [
  { id: 'basic', name: 'Basic', price: 10, features: ['기본 분석', '일일 리포트', '5개 프로젝트 모니터링'] },
  { id: 'pro', name: 'Professional', price: 50, features: ['고급 분석', '실시간 알림', '무제한 프로젝트 모니터링', '커스텀 대시보드'] },
  { id: 'enterprise', name: 'Enterprise', price: 200, features: ['AI 기반 예측', '전담 지원', '맞춤형 보고서', 'API 액세스', '무제한 사용자'] }
];

export default function UpgradePage() {
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
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
      console.error("Phantom 지갑을 찾을 수 없습니다");
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
  }, [connection]);

  // Connect wallet
  const connectWallet = async () => {
    const phantom = window.phantom?.solana;
    if (!phantom) {
      console.error("Phantom 지갑을 찾을 수 없습니다");
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
    } catch (error) {
      console.error("Connection error:", error);
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
      } catch (error) {
        console.error("Disconnect error:", error);
      }
    }
  };

  // Handle account change
  useEffect(() => {
    const handleAccountChange = (publicKey: string | undefined) => {
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

  // Handle upgrade
  const handleUpgrade = async () => {
    if (!selectedTier || !account || !connection) {
      console.error("지갑 연결 또는 티어 선택이 필요합니다");
      return;
    }

    setIsLoading(true);

    try {
      // 선택한 티어의 가격 가져오기
      const tier = TIERS.find(t => t.id === selectedTier);
      if (!tier) {
        throw new Error("Invalid tier selected");
      }

      // 사용자 잔액 확인
      const userPublicKey = new PublicKey(account);
      const userBalance = await getADRTokenBalance(connection, userPublicKey);
      
      if (userBalance < tier.price) {
        throw new Error(`잔액이 부족합니다. 필요: ${tier.price} ADR, 현재: ${userBalance} ADR`);
      }

      // 업그레이드 대상 주소 (실제 프로젝트에서는 환경 변수나 설정에서 가져오는 것이 좋습니다)
      const upgradeAddress = new PublicKey('UpgradeAddressHere'); // 실제 주소로 교체 필요
      
      // 트랜잭션 생성
      const transaction = await createTransferTransaction(
        connection,
        userPublicKey,
        upgradeAddress,
        tier.price
      );

      // 트랜잭션 서명 및 전송
      const signature = await signAndSendTransaction(transaction);

      // 백엔드에 업그레이드 정보 기록
      await recordUpgrade(account, selectedTier, tier.price, signature);

      // 성공 후 대시보드로 리디렉션
      router.push('/dashboard?upgraded=true');
    } catch (error: any) {
      console.error("Upgrade error:", error);
      alert(error.message || "업그레이드 처리 중 오류가 발생했습니다");
    } finally {
      setIsLoading(false);
    }
  };

  // Record upgrade to backend
  const recordUpgrade = async (walletAddress: string, tierId: string, amount: number, txSignature: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/subscriptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet_address: walletAddress,
          tier_id: tierId,
          amount: amount,
          transaction_signature: txSignature,
          blockchain: 'solana',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to record subscription upgrade');
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
      <h1 className="text-2xl font-bold mb-6">구독 업그레이드</h1>
      
      {!isConnected ? (
        <div className="text-center mb-8">
          <p className="mb-4">구독을 업그레이드하려면 Phantom 지갑을 연결하세요.</p>
          <Button onClick={connectWallet}>Phantom 지갑 연결하기</Button>
        </div>
      ) : (
        <>
          <div className="bg-muted p-4 rounded-lg mb-8">
            <p className="font-medium">연결된 지갑: {account?.substring(0, 6)}...{account?.substring(account.length - 4)}</p>
            {balance !== null && <p>현재 잔액: {balance} ADR</p>}
            <Button variant="outline" size="sm" className="mt-2" onClick={disconnectWallet}>
              연결 해제
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {TIERS.map((tier) => (
              <Card 
                key={tier.id} 
                className={`${selectedTier === tier.id ? 'border-primary' : ''} cursor-pointer transition-all hover:shadow-md`}
                onClick={() => setSelectedTier(tier.id)}
              >
                <CardHeader>
                  <CardTitle>{tier.name}</CardTitle>
                  <CardDescription>{tier.price} ADR / 월</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {tier.features.map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button 
                    variant={selectedTier === tier.id ? "default" : "outline"} 
                    className="w-full"
                    onClick={() => setSelectedTier(tier.id)}
                  >
                    {selectedTier === tier.id ? "선택됨" : "선택하기"}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
          
          <div className="text-center">
            <Button 
              size="lg" 
              onClick={handleUpgrade} 
              disabled={!selectedTier || isLoading || !balance || (selectedTier && TIERS.find(t => t.id === selectedTier)?.price || 0) > (balance || 0)}
            >
              {isLoading ? "처리 중..." : "업그레이드하기"}
            </Button>
            {selectedTier && balance !== null && (TIERS.find(t => t.id === selectedTier)?.price || 0) > balance && (
              <p className="text-red-500 mt-2">
                잔액이 부족합니다. 필요: {TIERS.find(t => t.id === selectedTier)?.price} ADR, 현재: {balance} ADR
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}