from fastapi import APIRouter, Depends, Request
from typing import Dict, List
from datetime import datetime
from pydantic import BaseModel

from app.models import APIKey
from app.auth.api_key import get_api_key_with_tracking

router = APIRouter()

class FundingRate(BaseModel):
    symbol: str
    exchange: str
    rate: float
    next_funding_time: datetime
    interval: str

class OpenInterest(BaseModel):
    symbol: str
    exchange: str
    open_interest: float
    open_interest_usd: float
    change_24h: float

# Funding rates for cryptocurrency futures
@router.get("/funding-rates", summary="Get current funding rates for major cryptocurrency futures markets")
async def get_funding_rates(request: Request, api_key: APIKey = Depends(get_api_key_with_tracking)):
    """
    Get current funding rates for major cryptocurrency futures markets
    
    Returns:
        List[FundingRate]: List of funding rates for different cryptocurrency pairs
    """
    # Dummy data
    return [
        FundingRate(
            symbol="BTC/USDT",
            exchange="Binance",
            rate=0.0012,
            next_funding_time=datetime.utcnow(),
            interval="8h"
        ),
        FundingRate(
            symbol="ETH/USDT",
            exchange="Binance",
            rate=0.0008,
            next_funding_time=datetime.utcnow(),
            interval="8h"
        ),
        FundingRate(
            symbol="BTC/USDT",
            exchange="Bybit",
            rate=0.0010,
            next_funding_time=datetime.utcnow(),
            interval="8h"
        ),
        FundingRate(
            symbol="ETH/USDT",
            exchange="Bybit",
            rate=0.0007,
            next_funding_time=datetime.utcnow(),
            interval="8h"
        ),
        FundingRate(
            symbol="BTC/USD",
            exchange="BitMEX",
            rate=0.0011,
            next_funding_time=datetime.utcnow(),
            interval="8h"
        )
    ]

# Open interest for cryptocurrency derivatives
@router.get("/open-interest", summary="Get open interest ratios for major cryptocurrency derivatives")
async def get_open_interest(request: Request, api_key: APIKey = Depends(get_api_key_with_tracking)):
    """
    Get open interest ratios for major cryptocurrency derivatives
    
    Returns:
        List[OpenInterest]: List of open interest data for different cryptocurrency pairs
    """
    # Dummy data
    return [
        OpenInterest(
            symbol="BTC/USDT",
            exchange="Binance",
            open_interest=45000.25,
            open_interest_usd=2250012500.0,
            change_24h=3.5
        ),
        OpenInterest(
            symbol="ETH/USDT",
            exchange="Binance",
            open_interest=350000.75,
            open_interest_usd=875001875.0,
            change_24h=2.1
        ),
        OpenInterest(
            symbol="BTC/USDT",
            exchange="OKX",
            open_interest=38000.5,
            open_interest_usd=1900025000.0,
            change_24h=1.8
        ),
        OpenInterest(
            symbol="ETH/USDT",
            exchange="OKX",
            open_interest=320000.0,
            open_interest_usd=800000000.0,
            change_24h=1.2
        ),
        OpenInterest(
            symbol="BTC/USD",
            exchange="Deribit",
            open_interest=25000.0,
            open_interest_usd=1250000000.0,
            change_24h=4.2
        )
    ]
