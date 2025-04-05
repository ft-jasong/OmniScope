'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { PublicKey, Connection } from '@solana/web3.js';
import { getConnection, getADRTokenBalance, createTransferTransaction, signAndSendTransaction, stakeTokens } from '@/utils/adr-token-client';

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
  const { toast } = useToast();

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
      toast({
        title: "업그레이드 실패",
        description: "지갑 연결 또는 티어 선택이 필요합니다.",
        variant: "destructive",
      });
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

      // 스테이킹 트랜잭션 생성 및 전송 (업그레이드 = 추가 스테이킹)
      const signature = await stakeTokens(
        connection,
        userPublicKey,
        tier.price
      );

      // 백엔드에 업그레이드 정보 기록
      await recordUpgrade(account, selectedTier, tier.price, signature);

      toast({
        title: "업그레이드 성공",
        description: `${tier.name} 티어로 성공적으로 업그레이드되었습니다.`,
      });

      // 잔액 업데이트
      const newBalance = await getADRTokenBalance(connection, userPublicKey);
      setBalance(newBalance);

      // 성공 후 처리 - 대시보드 페이지가 없으므로 리디렉션 제거
      // router.push('/dashboard?upgraded=true');
      
      // 대신 토스트 메시지로 안내
      toast({
        title: "안내",
        description: "업그레이드가 완료되었습니다. 이 페이지에서 계속 이용하실 수 있습니다.",
      });
    } catch (error: any) {
      console.error("Upgrade error:", error);
      toast({
        title: "업그레이드 실패",
        description: error.message || "업그레이드 처리 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Record upgrade to backend
  const recordUpgrade = async (walletAddress: string, tierId: string, amount: number, txSignature: string) => {
    try {
      // 백엔드 API 엔드포인트가 설정되어 있지 않을 경우 로그만 남김
      if (!process.env.NEXT_PUBLIC_API_BASE_URL) {
        console.log('백엔드 API 엔드포인트가 설정되지 않았습니다. 업그레이드 기록을 백엔드에 저장하지 않습니다.');
        console.log('업그레이드 정보:', { wallet_address: walletAddress, tier_id: tierId, amount, transaction_signature: txSignature });
        return;
      }
      
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
    } catch (error) {
      console.error("Record upgrade error:", error);
      // 백엔드 기록 실패는 사용자에게 표시하지 않음 (이미 업그레이드는 성공했기 때문)
    }
  };

  // Get tier details
  const getTierDetails = (tierId: string) => {
    return TIERS.find(tier => tier.id === tierId);
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">서비스 업그레이드</h1>
      
      {!isConnected ? (
        <div className="max-w-md mx-auto mb-8">
          <Card>
            <CardHeader>
              <CardTitle>지갑 연결</CardTitle>
              <CardDescription>
                업그레이드하려면 먼저 Phantom 지갑을 연결해주세요.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={connectWallet} className="w-full">
                Phantom 지갑 연결하기
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="max-w-md mx-auto mb-8">
          <Card>
            <CardHeader>
              <CardTitle>연결된 지갑</CardTitle>
              <CardDescription>
                {account?.substring(0, 6)}...{account?.substring(account.length - 4)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-medium">현재 잔액</span>
                <span className="text-sm font-medium">{balance !== null ? `${balance} ADR` : '로딩 중...'}</span>
              </div>
              <Button variant="outline" size="sm" onClick={disconnectWallet} className="w-full">
                지갑 연결 해제
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {TIERS.map((tier) => (
          <Card 
            key={tier.id} 
            className={`${selectedTier === tier.id ? 'border-primary' : ''}`}
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
                className="w-full" 
                variant={selectedTier === tier.id ? "default" : "outline"}
                onClick={() => setSelectedTier(tier.id)}
                disabled={!isConnected}
              >
                {selectedTier === tier.id ? '선택됨' : '선택하기'}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
      
      <div className="mt-8 text-center">
        <Button 
          onClick={handleUpgrade} 
          disabled={!selectedTier || !isConnected || isLoading}
          size="lg"
        >
          {isLoading ? "처리 중..." : "업그레이드하기"}
        </Button>
      </div>
    </div>
  );
}