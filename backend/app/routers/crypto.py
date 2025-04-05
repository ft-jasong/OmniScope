from fastapi import APIRouter, Depends, HTTPException, status, Header, Request
from sqlalchemy.orm import Session
from typing import Dict, Optional, List
import os
import time
import hmac
import hashlib
import requests
import json
from datetime import datetime
import logging
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import yfinance as yf
from bs4 import BeautifulSoup
import concurrent.futures

from app.database import get_db
from app.models import User, APIKey, APIUsage
from app.auth.dependencies import get_current_user
from app.auth.api_key import verify_api_key, get_api_key_with_tracking
from pydantic import BaseModel, Field

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('crypto_api')

router = APIRouter()

# 스키마 정의
class CryptoPrice(BaseModel):
    price: float
    currency: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class CryptoPriceList(BaseModel):
    prices: Dict[str, float]
    currency: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class KimchiPremium(BaseModel):
    premium_percentage: float
    binance_price_usd: float
    upbit_price_krw: float
    exchange_rate: float
    timestamp: datetime = Field(default_factory=datetime.utcnow)

# 요청 세션 생성 함수
def get_session_with_retries(
    retries=3,
    backoff_factor=0.3,
    status_forcelist=(500, 502, 504),
    allowed_methods=None
):
    """
    Create a request session with retry functionality
    
    Args:
        retries: Number of retry attempts
        backoff_factor: Time delay factor between retries
        status_forcelist: HTTP status codes to retry
        allowed_methods: HTTP methods to retry
        
    Returns:
        requests.Session: Session with retry functionality
    """
    if allowed_methods is None:
        allowed_methods = ["HEAD", "GET", "OPTIONS"]
    
    retry = Retry(
        total=retries,
        read=retries,
        connect=retries,
        backoff_factor=backoff_factor,
        status_forcelist=status_forcelist,
        allowed_methods=allowed_methods,
    )
    
    adapter = HTTPAdapter(max_retries=retry)
    session = requests.Session()
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    
    return session

# 바이낸스 API에서 암호화폐 가격 조회
def get_binance_price(symbol, max_retries=3, retry_delay=2):
    """
    Get the recent trading price of a specific cryptocurrency symbol from Binance API
    
    Args:
        symbol (str): Trading pair symbol (e.g., 'BTCUSDT', 'ETHUSDT')
        max_retries (int): Maximum number of retry attempts
        retry_delay (int): Delay between retries in seconds
        
    Returns:
        float: Latest price of the cryptocurrency
    """
    endpoint = "https://api.binance.com/api/v3/trades"
    
    # 요청 파라미터
    params = {
        'symbol': symbol,
        'limit': 1  # 가장 최근 거래만 필요
    }
    
    # 세션 생성
    session = get_session_with_retries()
    
    for attempt in range(max_retries + 1):
        try:
            logger.info(f"{symbol} 가격 조회 중 (시도 {attempt + 1}/{max_retries + 1})")
            response = session.get(endpoint, params=params, timeout=10)
            response.raise_for_status()
            
            trades = response.json()
            if trades and len(trades) > 0:
                price = float(trades[0]['price'])
                logger.info(f"{symbol} 가격 조회 성공: {price}")
                return price
            else:
                logger.warning(f"{symbol}에 대한 거래 정보가 없습니다")
                if attempt < max_retries:
                    logger.info(f"{retry_delay}초 후 재시도...")
                    time.sleep(retry_delay)
                    continue
                return None
                
        except requests.exceptions.RequestException as e:
            logger.error(f"{symbol} 가격 조회 오류: {e}")
            if attempt < max_retries:
                logger.info(f"{retry_delay}초 후 재시도...")
                time.sleep(retry_delay)
            else:
                logger.error(f"{symbol}에 대한 최대 재시도 횟수에 도달했습니다. 포기합니다.")
                return None
        except (ValueError, KeyError, TypeError) as e:
            logger.error(f"{symbol} 응답 파싱 오류: {e}")
            if attempt < max_retries:
                logger.info(f"{retry_delay}초 후 재시도...")
                time.sleep(retry_delay)
            else:
                logger.error(f"{symbol}에 대한 최대 재시도 횟수에 도달했습니다. 포기합니다.")
                return None

# 업비트 API에서 BTC 가격 조회
def get_upbit_btc_price(max_retries=3, retry_delay=2):
    """
    Get BTC price from Upbit API
    
    Args:
        max_retries (int): Maximum number of retry attempts
        retry_delay (int): Delay between retries in seconds
        
    Returns:
        float: BTC price in KRW
    """
    endpoint = "https://api.upbit.com/v1/ticker"
    params = {'markets': 'KRW-BTC'}
    headers = {'Accept': 'application/json'}
    
    # 세션 생성
    session = get_session_with_retries()
    
    for attempt in range(max_retries + 1):
        try:
            logger.info(f"업비트에서 BTC 가격 조회 중 (시도 {attempt + 1}/{max_retries + 1})")
            response = session.get(endpoint, params=params, headers=headers, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            if data and len(data) > 0:
                price = float(data[0]['trade_price'])
                logger.info(f"업비트 BTC 가격 조회 성공: {price} KRW")
                return price
            else:
                logger.warning("업비트에서 데이터를 찾을 수 없습니다")
                if attempt < max_retries:
                    logger.info(f"{retry_delay}초 후 재시도...")
                    time.sleep(retry_delay)
                    continue
                return None
                
        except requests.exceptions.RequestException as e:
            logger.error(f"업비트 BTC 가격 조회 오류: {e}")
            if attempt < max_retries:
                logger.info(f"{retry_delay}초 후 재시도...")
                time.sleep(retry_delay)
            else:
                logger.error(f"업비트 BTC 가격에 대한 최대 재시도 횟수에 도달했습니다. 포기합니다.")
                return None
        except (ValueError, KeyError, TypeError) as e:
            logger.error(f"업비트 응답 파싱 오류: {e}")
            if attempt < max_retries:
                logger.info(f"{retry_delay}초 후 재시도...")
                time.sleep(retry_delay)
            else:
                logger.error(f"업비트 BTC 가격에 대한 최대 재시도 횟수에 도달했습니다. 포기합니다.")
                return None

# 업비트 API에서 USDT 가격 조회
def get_upbit_usdt_price(max_retries=3, retry_delay=2):
    """
    Get USDT price from Upbit API
    
    Args:
        max_retries (int): Maximum number of retry attempts
        retry_delay (int): Delay between retries in seconds
        
    Returns:
        float: USDT price in KRW
    """
    endpoint = "https://api.upbit.com/v1/ticker"
    params = {'markets': 'KRW-USDT'}
    headers = {'Accept': 'application/json'}
    
    # 세션 생성
    session = get_session_with_retries()
    
    for attempt in range(max_retries + 1):
        try:
            logger.info(f"업비트에서 USDT 가격 조회 중 (시도 {attempt + 1}/{max_retries + 1})")
            response = session.get(endpoint, params=params, headers=headers, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            if data and len(data) > 0:
                price = float(data[0]['trade_price'])
                logger.info(f"업비트 USDT 가격 조회 성공: {price} KRW")
                return price
            else:
                logger.warning("업비트에서 USDT 데이터를 찾을 수 없습니다")
                if attempt < max_retries:
                    logger.info(f"{retry_delay}초 후 재시도...")
                    time.sleep(retry_delay)
                    continue
                return None
                
        except requests.exceptions.RequestException as e:
            logger.error(f"업비트 USDT 가격 조회 오류: {e}")
            if attempt < max_retries:
                logger.info(f"{retry_delay}초 후 재시도...")
                time.sleep(retry_delay)
            else:
                logger.error(f"업비트 USDT 가격에 대한 최대 재시도 횟수에 도달했습니다. 포기합니다.")
                return None
        except (ValueError, KeyError, TypeError) as e:
            logger.error(f"업비트 USDT 응답 파싱 오류: {e}")
            if attempt < max_retries:
                logger.info(f"{retry_delay}초 후 재시도...")
                time.sleep(retry_delay)
            else:
                logger.error(f"업비트 USDT 가격에 대한 최대 재시도 횟수에 도달했습니다. 포기합니다.")
                return None

# 네이버 파이낸스에서 USD/KRW 환율 조회
def get_usd_krw_rate_naver(max_retries=3, retry_delay=2):
    """
    Get USD/KRW exchange rate from Naver Finance
    
    Args:
        max_retries (int): Maximum number of retry attempts
        retry_delay (int): Delay between retries in seconds
        
    Returns:
        float: USD/KRW exchange rate
    """
    for attempt in range(max_retries + 1):
        try:
            logger.info(f"네이버 파이낸스에서 USD/KRW 환율 조회 중 (시도 {attempt + 1}/{max_retries + 1})")
            
            # 네이버 파이낸스 환율 페이지 URL
            url = 'https://finance.naver.com/marketindex/'
            
            # 브라우저 User-Agent 헤더 추가
            headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'}
            
            # 세션 생성
            session = get_session_with_retries()
            
            # 웹 페이지 요청
            response = session.get(url, headers=headers, timeout=10)
            response.raise_for_status()
            
            # BeautifulSoup으로 HTML 파싱
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # 환율 정보가 포함된 요소 찾기
            exchange_rate_element = soup.select_one('#exchangeList > li.on > a.head.usd > div > span.value')
            
            if exchange_rate_element:
                # 환율 텍스트 추출 및 float로 변환
                exchange_rate_text = exchange_rate_element.text.strip().replace(',', '')
                exchange_rate = float(exchange_rate_text)
                logger.info(f"네이버 파이낸스에서 USD/KRW 환율 조회 성공: {exchange_rate}")
                return exchange_rate
            else:
                logger.warning("네이버 파이낸스 페이지에서 환율 요소를 찾을 수 없습니다")
                if attempt < max_retries:
                    logger.info(f"{retry_delay}초 후 재시도...")
                    time.sleep(retry_delay)
                    continue
                return None
                
        except Exception as e:
            logger.error(f"네이버 파이낸스에서 USD/KRW 환율 조회 오류: {e}")
            if attempt < max_retries:
                logger.info(f"{retry_delay}초 후 재시도...")
                time.sleep(retry_delay)
            else:
                logger.error("네이버 파이낸스에서 USD/KRW 환율에 대한 최대 재시도 횟수에 도달했습니다. 포기합니다.")
                return None

# Yahoo Finance에서 USD/KRW 환율 조회
def get_usd_krw_rate_yahoo(max_retries=3, retry_delay=2):
    """
    Get USD/KRW exchange rate from Yahoo Finance
    
    Args:
        max_retries (int): Maximum number of retry attempts
        retry_delay (int): Delay between retries in seconds
        
    Returns:
        float: USD/KRW exchange rate
    """
    for attempt in range(max_retries + 1):
        try:
            logger.info(f"Yahoo Finance에서 USD/KRW 환율 조회 중 (시도 {attempt + 1}/{max_retries + 1})")
            ticker = 'USDKRW=X'
            data = yf.Ticker(ticker)
            
            # 현재 환율 조회
            exchange_rate = data.info['regularMarketPrice']
            logger.info(f"Yahoo Finance에서 USD/KRW 환율 조회 성공: {exchange_rate}")
            return exchange_rate
            
        except Exception as e:
            logger.error(f"Yahoo Finance에서 USD/KRW 환율 조회 오류: {e}")
            if attempt < max_retries:
                logger.info(f"{retry_delay}초 후 재시도...")
                time.sleep(retry_delay)
            else:
                logger.error("Yahoo Finance에서 USD/KRW 환율에 대한 최대 재시도 횟수에 도달했습니다. 네이버 파이낸스로 시도합니다...")
                return None

# USD/KRW 환율 조회 (네이버 및 Yahoo 폴백 메커니즘)
def get_usd_krw_rate(max_retries=3, retry_delay=2):
    """
    Get USD/KRW exchange rate (using fallback mechanism)
    First tries Naver Finance, then falls back to Yahoo Finance if that fails
    
    Args:
        max_retries (int): Maximum number of retry attempts
        retry_delay (int): Delay between retries in seconds
        
    Returns:
        float: USD/KRW exchange rate
    """
    # 먼저 네이버 파이낸스 시도
    rate = get_usd_krw_rate_naver(max_retries, retry_delay)
    
    # 네이버 파이낸스가 실패하면 Yahoo Finance 시도
    if rate is None:
        rate = get_usd_krw_rate_yahoo(max_retries, retry_delay)
    
    return rate

# 김치 프리미엄 계산
def calculate_premium(binance_price, upbit_price_krw, exchange_rate):
    """
    Calculate the premium percentage between Upbit and Binance prices
    Uses the following formula:
    (UPBIT:BTCKRW - BINANCE:BTCUSDT * FX_IDC:USDKRW) / (BINANCE:BTCUSDT * FX_IDC:USDKRW) * 100
    
    Args:
        binance_price (float): BTC price in USD from Binance (BINANCE:BTCUSDT)
        upbit_price_krw (float): BTC price in KRW from Upbit (UPBIT:BTCKRW)
        exchange_rate (float): USD/KRW exchange rate (FX_IDC:USDKRW)
        
    Returns:
        float: Premium percentage
    """
    if not binance_price or not upbit_price_krw or not exchange_rate:
        return None
    
    # 바이낸스 BTC 가격을 KRW로 변환
    binance_price_krw = binance_price * exchange_rate
    
    # 공식을 사용하여 프리미엄 계산
    premium_percentage = (upbit_price_krw - binance_price_krw) / binance_price_krw * 100
    
    return premium_percentage

# API 엔드포인트: BTC 달러 가격
@router.get("/btc/usd", response_model=CryptoPrice, summary="Get BTC price in USD")
async def get_btc_usd_price(request: Request, api_key: APIKey = Depends(get_api_key_with_tracking)):
    """
    Get BTC price in USD from Binance API
    
    Returns:
        CryptoPrice: BTC price information in USD
    """
    price = get_binance_price('BTCUSDT')
    
    if price is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Failed to retrieve BTC price from Binance API"
        )
    
    return CryptoPrice(
        price=price,
        currency="USD",
        timestamp=datetime.utcnow()
    )

# API 엔드포인트: BTC 원화 가격
@router.get("/btc/krw", response_model=CryptoPrice, summary="Get BTC price in KRW")
async def get_btc_krw_price(request: Request, api_key: APIKey = Depends(get_api_key_with_tracking)):
    """
    Get BTC price in KRW from Upbit API
    
    Returns:
        CryptoPrice: BTC price information in KRW
    """
    price = get_upbit_btc_price()
    
    if price is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Failed to retrieve BTC price from Upbit API"
        )
    
    return CryptoPrice(
        price=price,
        currency="KRW",
        timestamp=datetime.utcnow()
    )

# API 엔드포인트: USDT 원화 가격
@router.get("/usdt/krw", response_model=CryptoPrice, summary="Get USDT price in KRW")
async def get_usdt_krw_price(request: Request, api_key: APIKey = Depends(get_api_key_with_tracking)):
    """
    Get USDT price in KRW from Upbit API
    
    Returns:
        CryptoPrice: USDT price information in KRW
    """
    price = get_upbit_usdt_price()
    
    if price is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Failed to retrieve USDT price from Upbit API"
        )
    
    return CryptoPrice(
        price=price,
        currency="KRW",
        timestamp=datetime.utcnow()
    )

# API 엔드포인트: 김치 프리미엄 비율
@router.get("/kimchi-premium", response_model=KimchiPremium, summary="Get kimchi premium percentage")
async def get_kimchi_premium(request: Request, api_key: APIKey = Depends(get_api_key_with_tracking)):
    """
    Get kimchi premium percentage between Upbit and Binance prices
    
    Returns:
        KimchiPremium: Kimchi premium information
    """
    # ThreadPoolExecutor를 사용하여 모든 가격을 병렬로 조회
    with concurrent.futures.ThreadPoolExecutor() as executor:
        # 모든 작업을 executor에 제출
        binance_btc_future = executor.submit(get_binance_price, 'BTCUSDT')
        upbit_btc_future = executor.submit(get_upbit_btc_price)
        usd_krw_future = executor.submit(get_usd_krw_rate)
        
        # futures에서 결과 가져오기
        binance_btc_price = binance_btc_future.result()
        upbit_btc_price = upbit_btc_future.result()
        usd_krw_rate = usd_krw_future.result()
    
    # 필요한 값 중 하나라도 None인지 확인
    if None in [binance_btc_price, upbit_btc_price, usd_krw_rate]:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Failed to retrieve necessary price information"
        )
    
    # 프리미엄 계산
    premium = calculate_premium(binance_btc_price, upbit_btc_price, usd_krw_rate)
    
    if premium is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Failed to calculate kimchi premium"
        )
    
    return KimchiPremium(
        premium_percentage=premium,
        binance_price_usd=binance_btc_price,
        upbit_price_krw=upbit_btc_price,
        exchange_rate=usd_krw_rate,
        timestamp=datetime.utcnow()
    )

# API 엔드포인트: 주요 암호화폐 가격 목록
@router.get("/prices", response_model=CryptoPriceList, summary="Get major cryptocurrency prices")
async def get_crypto_prices(request: Request, api_key: APIKey = Depends(get_api_key_with_tracking)):
    """
    Get major cryptocurrency prices (BTC, ETH, XRP) from Binance API
    
    Returns:
        CryptoPriceList: Major cryptocurrency price list
    """
    # ThreadPoolExecutor를 사용하여 모든 가격을 병렬로 조회
    with concurrent.futures.ThreadPoolExecutor() as executor:
        # 모든 작업을 executor에 제출
        btc_future = executor.submit(get_binance_price, 'BTCUSDT')
        eth_future = executor.submit(get_binance_price, 'ETHUSDT')
        xrp_future = executor.submit(get_binance_price, 'XRPUSDT')
        
        # futures에서 결과 가져오기
        btc_price = btc_future.result()
        eth_price = eth_future.result()
        xrp_price = xrp_future.result()
    
    # 결과 딕셔너리 생성
    prices = {
        'BTC': btc_price,
        'ETH': eth_price,
        'XRP': xrp_price
    }
    
    # None 값 필터링
    prices = {k: v for k, v in prices.items() if v is not None}
    
    if not prices:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Failed to retrieve cryptocurrency prices"
        )
    
    return CryptoPriceList(
        prices=prices,
        currency="USD",
        timestamp=datetime.utcnow()
    )
