from fastapi import APIRouter, Depends, Request
from typing import Dict, List
from datetime import datetime
from pydantic import BaseModel

from app.models import APIKey
from app.auth.api_key import get_api_key_with_tracking

router = APIRouter()

class PullRequest(BaseModel):
    id: int
    title: str
    author: str
    created_at: datetime
    updated_at: datetime
    state: str
    url: str
    comments: int
    additions: int
    deletions: int

class RepositoryStats(BaseModel):
    stars: int
    forks: int
    open_issues: int
    watchers: int
    last_commit: datetime
    contributors_count: int
    release_version: str
    release_date: datetime

# Bitcoin Core repository activity
@router.get("/bitcoin", summary="Get latest pull requests, stars, and activities from Bitcoin Core repository")
async def get_bitcoin_activity(request: Request, api_key: APIKey = Depends(get_api_key_with_tracking)):
    """
    Get latest pull requests, stars, and activities from Bitcoin Core repository
    
    Returns:
        Dict: Dictionary containing repository stats and recent pull requests
    """
    # Dummy data
    return {
        "stats": RepositoryStats(
            stars=72500,
            forks=34200,
            open_issues=1250,
            watchers=4800,
            last_commit=datetime.utcnow(),
            contributors_count=890,
            release_version="25.1",
            release_date=datetime.utcnow()
        ),
        "pull_requests": [
            PullRequest(
                id=28123,
                title="p2p: Add support for v2 transport protocol",
                author="theStack",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
                state="open",
                url="https://github.com/bitcoin/bitcoin/pull/28123",
                comments=45,
                additions=2500,
                deletions=1200
            ),
            PullRequest(
                id=28120,
                title="wallet: Improve coin selection algorithm efficiency",
                author="achow101",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
                state="open",
                url="https://github.com/bitcoin/bitcoin/pull/28120",
                comments=32,
                additions=850,
                deletions=320
            ),
            PullRequest(
                id=28115,
                title="consensus: Optimize block validation process",
                author="sipa",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
                state="merged",
                url="https://github.com/bitcoin/bitcoin/pull/28115",
                comments=78,
                additions=1200,
                deletions=950
            ),
            PullRequest(
                id=28110,
                title="doc: Update developer documentation for new RPC methods",
                author="MarcoFalke",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
                state="merged",
                url="https://github.com/bitcoin/bitcoin/pull/28110",
                comments=15,
                additions=450,
                deletions=120
            )
        ]
    }

# Ethereum Core repositories activity
@router.get("/ethereum", summary="Get latest pull requests, stars, and activities from Ethereum Core repositories")
async def get_ethereum_activity(request: Request, api_key: APIKey = Depends(get_api_key_with_tracking)):
    """
    Get latest pull requests, stars, and activities from Ethereum Core repositories
    
    Returns:
        Dict: Dictionary containing repository stats and recent pull requests for multiple Ethereum repositories
    """
    # Dummy data
    return {
        "go-ethereum": {
            "stats": RepositoryStats(
                stars=43800,
                forks=18500,
                open_issues=320,
                watchers=2800,
                last_commit=datetime.utcnow(),
                contributors_count=720,
                release_version="1.13.4",
                release_date=datetime.utcnow()
            ),
            "pull_requests": [
                PullRequest(
                    id=28500,
                    title="eth: Implement EIP-4844 blob transaction support",
                    author="karalabe",
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                    state="merged",
                    url="https://github.com/ethereum/go-ethereum/pull/28500",
                    comments=65,
                    additions=3200,
                    deletions=1500
                ),
                PullRequest(
                    id=28495,
                    title="core: Optimize state trie access patterns",
                    author="holiman",
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                    state="open",
                    url="https://github.com/ethereum/go-ethereum/pull/28495",
                    comments=42,
                    additions=1800,
                    deletions=950
                )
            ]
        },
        "consensus-specs": {
            "stats": RepositoryStats(
                stars=12500,
                forks=4300,
                open_issues=180,
                watchers=950,
                last_commit=datetime.utcnow(),
                contributors_count=320,
                release_version="v1.4.0",
                release_date=datetime.utcnow()
            ),
            "pull_requests": [
                PullRequest(
                    id=3250,
                    title="specs: Add Verkle tree transition specifications",
                    author="dankrad",
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                    state="open",
                    url="https://github.com/ethereum/consensus-specs/pull/3250",
                    comments=85,
                    additions=4500,
                    deletions=1200
                ),
                PullRequest(
                    id=3245,
                    title="specs: Improve validator rewards calculation",
                    author="djrtwo",
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                    state="merged",
                    url="https://github.com/ethereum/consensus-specs/pull/3245",
                    comments=38,
                    additions=850,
                    deletions=420
                )
            ]
        }
    }
