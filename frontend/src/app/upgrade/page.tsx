'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { PublicKey, Connection } from '@solana/web3.js';
import { getConnection, getADRTokenBalance, stakeTokens } from '@/utils/adr-token-client';

// 티어 정보 타입 정의
interface TierInfo {
  name: string;
  description: string;
  features: string[];
  price: number;
  color: string;
}

export default function UpgradePage() {
  const [account, setAccount] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedTier, setSelectedTier] = useState<string>('basic');
  const { toast } = useToast();
  const [connection, setConnection] = useState<Connection | null>(null);

  // 티어 정보
  const tiers: Record<string, TierInfo> = {
    basic: {
      name: '기본 티어',
      description: '기본적인 서비스 이용',
      features: ['기본 분석 기능', '일일 10회 요청 제한', '기본 대시보드'],
      price: 50,
      color: 'bg-blue-100 dark:bg-blue-950',
    },
    pro: {
      name: '프로 티어',
      description: '전문가를 위한 확장 기능',
      features: ['고급 분석 기능', '일일 100회 요청', '고급 대시보드', 'API 액세스'],
      price: 200,
      color: 'bg-purple-100 dark:bg-purple-950',
    },
    enterprise: {
      name: '엔터프라이즈 티어',
      description: '기업을 위한 최고급 서비스',
      features: ['무제한 분석 기능', '무제한 요청', '커스텀 대시보드', '전용 API', '우선 지원'],
      price: 500,
      color: 'bg-amber-100 dark:bg-amber-950',
    },
  };

  // Check wallet connection
  const checkConnection = useCallback(async () => {
    const phantom = window.phantom?.solana;
    if (!phantom) {
      return;
    }

    try {
      // 이미 연결된 지갑 확인 (자동 연결)
      const resp = await phantom.connect();
      const address = resp.publicKey.toString();
      setAccount(address);

      // Get balance if connection is available
      if (connection) {
        const userPublicKey = new PublicKey(address);
        const userBalance = await getADRTokenBalance(connection, userPublicKey);
        setBalance(userBalance);
      }
    } catch (error) {
      console.error("Auto-connection error:", error);
      // User not previously connected or connection failed, do nothing
    }
  }, [connection, setAccount, setBalance]);

  // Initialize connection
  useEffect(() => {
    const conn = getConnection('devnet'); // 'devnet', 'testnet', or 'mainnet-beta'
    setConnection(conn);
    checkConnection();
  }, [checkConnection]);

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

  // Handle upgrade
  const handleUpgrade = async () => {
    if (!account || !connection) {
      toast({
        title: "지갑 연결 필요",
        description: "먼저 Phantom 지갑을 연결해주세요.",
        variant: "destructive",
      });
      return;
    }

    const tierInfo = tiers[selectedTier];
    if (!tierInfo) {
      toast({
        title: "티어 선택 오류",
        description: "유효한 티어를 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    // 잔액 확인
    if (balance === null || balance < tierInfo.price) {
      toast({
        title: "잔액 부족",
        description: `업그레이드에 필요한 ADR 토큰이 부족합니다. 필요 금액: ${tierInfo.price} ADR`,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // 사용자 공개키 생성
      const userPublicKey = new PublicKey(account);
      
      // 스테이킹 트랜잭션 생성 및 전송 (업그레이드에는 deposit 함수 사용)
      const signature = await stakeTokens(
        connection,
        userPublicKey,
        tierInfo.price
      );

      // 백엔드에 업그레이드 정보 기록
      await recordUpgrade(account, selectedTier, tierInfo.price, signature);

      toast({
        title: "업그레이드 성공",
        description: `${tierInfo.name}로 성공적으로 업그레이드되었습니다.`,
      });

      // 잔액 업데이트
      const newBalance = await getADRTokenBalance(connection, userPublicKey);
      setBalance(newBalance);
    } catch (error) {
      console.error("Upgrade error:", error);
      const errorMessage = error instanceof Error ? error.message : "업그레이드 처리 중 오류가 발생했습니다.";
      toast({
        title: "업그레이드 실패",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Record upgrade to backend
  const recordUpgrade = async (walletAddress: string, tier: string, amount: number, txSignature: string) => {
    try {
      // 백엔드 API 엔드포인트가 설정되어 있지 않을 경우 로그만 남김
      if (!process.env.NEXT_PUBLIC_API_BASE_URL) {
        console.log('백엔드 API 엔드포인트가 설정되지 않았습니다. 업그레이드 기록을 백엔드에 저장하지 않습니다.');
        console.log('업그레이드 정보:', { wallet_address: walletAddress, tier, amount, transaction_signature: txSignature });
        return;
      }
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/upgrades`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet_address: walletAddress,
          tier: tier,
          amount: amount,
          transaction_signature: txSignature,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to record upgrade');
      }
    } catch (error) {
      console.error("Record upgrade error:", error);
      // 백엔드 기록 실패는 사용자에게 표시하지 않음 (이미 업그레이드는 성공했기 때문)
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">서비스 업그레이드</h1>
      
      <div className="max-w-4xl mx-auto">
        {!account ? (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>지갑 연결</CardTitle>
              <CardDescription>
                서비스를 업그레이드하려면 먼저 Phantom 지갑을 연결해주세요.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button onClick={connectWallet} className="w-full">
                Phantom 지갑 연결하기
              </Button>
            </CardFooter>
          </Card>
        ) : (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>연결된 지갑</CardTitle>
              <CardDescription>
                {account.substring(0, 10)}...{account.substring(account.length - 10)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <span className="font-medium">ADR 토큰 잔액:</span>
                <span className="font-bold">{balance !== null ? `${balance} ADR` : '로딩 중...'}</span>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={disconnectWallet}>
                연결 해제
              </Button>
            </CardFooter>
          </Card>
        )}
        
        <Tabs defaultValue="basic" value={selectedTier} onValueChange={setSelectedTier}>
          <TabsList className="grid grid-cols-3 mb-8">
            <TabsTrigger value="basic">기본 티어</TabsTrigger>
            <TabsTrigger value="pro">프로 티어</TabsTrigger>
            <TabsTrigger value="enterprise">엔터프라이즈 티어</TabsTrigger>
          </TabsList>
          
          {Object.entries(tiers).map(([tierId, tier]) => (
            <TabsContent key={tierId} value={tierId}>
              <Card className={`${tier.color} border-0`}>
                <CardHeader>
                  <CardTitle>{tier.name}</CardTitle>
                  <CardDescription className="text-black dark:text-white">
                    {tier.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold mb-4">{tier.price} ADR</div>
                  <ul className="space-y-2">
                    {tier.features.map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full" 
                    onClick={handleUpgrade}
                    disabled={!account || isLoading || (balance !== null && balance < tier.price)}
                  >
                    {isLoading ? "처리 중..." : "업그레이드"}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}