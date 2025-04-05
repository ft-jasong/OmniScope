from fastapi import APIRouter, Depends, Request
from typing import Dict, List
from datetime import datetime
from pydantic import BaseModel

from app.models import APIKey
from app.auth.api_key import get_api_key_with_tracking

router = APIRouter()

class SocialPost(BaseModel):
    id: str
    username: str
    content: str
    timestamp: datetime
    likes: int
    reposts: int
    comments: int

class TrendingTopic(BaseModel):
    id: str
    name: str
    tweet_count: int
    category: str
    location: str = None

# Trump's latest posts from Truth Social
@router.get("/trump", summary="Get Donald Trump's latest posts from Truth Social")
async def get_trump_posts(request: Request, api_key: APIKey = Depends(get_api_key_with_tracking)):
    """
    Get Donald Trump's latest posts from Truth Social
    
    Returns:
        List[SocialPost]: List of Trump's latest posts
    """
    # Dummy data
    return [
        SocialPost(
            id="ts_123456789",
            username="realDonaldTrump",
            content="MAKE AMERICA GREAT AGAIN! The economy is booming like never before. Jobs, jobs, jobs!",
            timestamp=datetime.utcnow(),
            likes=45000,
            reposts=20000,
            comments=15000
        ),
        SocialPost(
            id="ts_123456788",
            username="realDonaldTrump",
            content="The Fake News Media is working overtime to spread disinformation. SAD!",
            timestamp=datetime.utcnow(),
            likes=38000,
            reposts=18000,
            comments=12000
        ),
        SocialPost(
            id="ts_123456787",
            username="realDonaldTrump",
            content="Just had a great meeting with world leaders. America is respected again!",
            timestamp=datetime.utcnow(),
            likes=42000,
            reposts=19000,
            comments=14000
        )
    ]

# Elon Musk's latest posts from X (Twitter)
@router.get("/elon", summary="Get Elon Musk's latest posts from X (Twitter)")
async def get_elon_posts(request: Request, api_key: APIKey = Depends(get_api_key_with_tracking)):
    """
    Get Elon Musk's latest posts from X (Twitter)
    
    Returns:
        List[SocialPost]: List of Elon Musk's latest posts
    """
    # Dummy data
    return [
        SocialPost(
            id="x_987654321",
            username="elonmusk",
            content="The future of sustainable energy is here. Tesla's new battery technology will revolutionize the industry.",
            timestamp=datetime.utcnow(),
            likes=120000,
            reposts=50000,
            comments=30000
        ),
        SocialPost(
            id="x_987654320",
            username="elonmusk",
            content="SpaceX Starship successfully completed its orbital test flight. Mars, here we come!",
            timestamp=datetime.utcnow(),
            likes=200000,
            reposts=80000,
            comments=45000
        ),
        SocialPost(
            id="x_987654319",
            username="elonmusk",
            content="Cryptocurrency is the future of finance. Dogecoin to the moon! 🚀",
            timestamp=datetime.utcnow(),
            likes=150000,
            reposts=70000,
            comments=40000
        )
    ]

# X (Twitter) trending topics
@router.get("/x/trends", summary="Get current trending topics on X (Twitter)")
async def get_x_trends(request: Request, api_key: APIKey = Depends(get_api_key_with_tracking)):
    """
    Get current trending topics on X (Twitter)
    
    Returns:
        List[TrendingTopic]: List of trending topics on X (Twitter)
    """
    # Dummy data
    return [
        TrendingTopic(
            id="trend_1",
            name="#Crypto",
            tweet_count=250000,
            category="Business & Finance"
        ),
        TrendingTopic(
            id="trend_2",
            name="#HSK",
            tweet_count=180000,
            category="Cryptocurrency"
        ),
        TrendingTopic(
            id="trend_3",
            name="#NFTs",
            tweet_count=150000,
            category="Technology"
        ),
        TrendingTopic(
            id="trend_4",
            name="#Web3",
            tweet_count=120000,
            category="Technology"
        ),
        TrendingTopic(
            id="trend_5",
            name="#DeFi",
            tweet_count=100000,
            category="Business & Finance"
        )
    ]
