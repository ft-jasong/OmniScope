from fastapi import APIRouter, Depends, Request
from typing import Dict, List
from datetime import datetime
from pydantic import BaseModel

from app.models import APIKey
from app.auth.api_key import get_api_key_with_tracking

router = APIRouter()

class ProjectUpdate(BaseModel):
    title: str
    description: str
    date: datetime
    url: str
    type: str  # "release", "announcement", "partnership", etc.

class EthereumStandard(BaseModel):
    eip_number: int
    title: str
    status: str
    type: str
    category: str
    author: str
    created: datetime
    url: str
    description: str

# HashKey Chain updates
@router.get("/hsk", summary="Get latest updates and developments from HashKey Chain")
async def get_hsk_updates(request: Request, api_key: APIKey = Depends(get_api_key_with_tracking)):
    """
    Get latest updates and developments from HashKey Chain
    
    Returns:
        List[ProjectUpdate]: List of recent updates from HashKey Chain
    """
    # Dummy data
    return [
        ProjectUpdate(
            title="HashKey Chain Mainnet Upgrade v1.2.0",
            description="Major network upgrade improving transaction throughput and reducing gas fees",
            date=datetime.utcnow(),
            url="https://hashkey.com/blog/mainnet-upgrade-v1-2-0",
            type="release"
        ),
        ProjectUpdate(
            title="HashKey Chain Partners with Leading DeFi Protocols",
            description="Strategic partnerships with top DeFi protocols to enhance the HSK ecosystem",
            date=datetime.utcnow(),
            url="https://hashkey.com/blog/defi-partnerships",
            type="partnership"
        ),
        ProjectUpdate(
            title="HashKey Chain Developer Grants Program Launches",
            description="$10 million fund to support developers building on the HashKey Chain",
            date=datetime.utcnow(),
            url="https://hashkey.com/blog/developer-grants-program",
            type="announcement"
        ),
        ProjectUpdate(
            title="HashKey Chain Integrates with Chainlink Oracle Network",
            description="Integration with Chainlink provides secure and reliable oracle services for HSK DApps",
            date=datetime.utcnow(),
            url="https://hashkey.com/blog/chainlink-integration",
            type="integration"
        )
    ]

# Ethereum standards
@router.get("/ethereum/standards", summary="Get information about new Ethereum standards and proposals")
async def get_ethereum_standards(request: Request, api_key: APIKey = Depends(get_api_key_with_tracking)):
    """
    Get information about new Ethereum standards and proposals
    
    Returns:
        List[EthereumStandard]: List of recent Ethereum Improvement Proposals (EIPs)
    """
    # Dummy data
    return [
        EthereumStandard(
            eip_number=4844,
            title="Shard Blob Transactions",
            status="Final",
            type="Standards Track",
            category="Core",
            author="Vitalik Buterin, Dankrad Feist, Diederik Loerakker, George Kadianakis, Matt Garnett, Mofi Taiwo, Proto Lambda",
            created=datetime.utcnow(),
            url="https://eips.ethereum.org/EIPS/eip-4844",
            description="This EIP introduces a new transaction format for 'blob-carrying transactions' which contain a large amount of data that cannot be accessed by EVM execution, but whose commitment can be accessed."
        ),
        EthereumStandard(
            eip_number=1559,
            title="Fee market change for ETH 1.0 chain",
            status="Final",
            type="Standards Track",
            category="Core",
            author="Vitalik Buterin, Eric Conner, Rick Dudley, Matthew Slipper, Ian Norden, Abdelhamid Bakhta",
            created=datetime.utcnow(),
            url="https://eips.ethereum.org/EIPS/eip-1559",
            description="This EIP introduces a transaction pricing mechanism that includes fixed-per-block network fee that is burned and dynamically expands/contracts block sizes to deal with transient congestion."
        ),
        EthereumStandard(
            eip_number=6551,
            title="Non-fungible Token Bound Accounts",
            status="Review",
            type="Standards Track",
            category="ERC",
            author="Jayden Windle, Benny Giang, Jaime Armas, Alanah Lam, Brent Castiglione, Shiny Marisa",
            created=datetime.utcnow(),
            url="https://eips.ethereum.org/EIPS/eip-6551",
            description="A standard for NFTs to own assets and execute transactions, allowing them to function like traditional accounts."
        )
    ]

# Solana updates
@router.get("/solana", summary="Get latest updates and developments from Solana blockchain")
async def get_solana_updates(request: Request, api_key: APIKey = Depends(get_api_key_with_tracking)):
    """
    Get latest updates and developments from Solana blockchain
    
    Returns:
        List[ProjectUpdate]: List of recent updates from Solana blockchain
    """
    # Dummy data
    return [
        ProjectUpdate(
            title="Solana Mainnet Beta Upgrade to v1.16",
            description="Major network upgrade improving transaction processing and reducing network congestion",
            date=datetime.utcnow(),
            url="https://solana.com/news/mainnet-beta-v1-16",
            type="release"
        ),
        ProjectUpdate(
            title="Solana Mobile Stack and Saga Phone Launch",
            description="Solana launches mobile stack and Saga phone to bring Web3 to mobile users",
            date=datetime.utcnow(),
            url="https://solana.com/news/solana-mobile-stack-launch",
            type="product"
        ),
        ProjectUpdate(
            title="Solana Breakpoint 2025 Conference Announced",
            description="Annual Solana developer conference to be held in Singapore",
            date=datetime.utcnow(),
            url="https://solana.com/news/breakpoint-2025",
            type="event"
        ),
        ProjectUpdate(
            title="Solana Foundation Announces $100M Ecosystem Fund",
            description="New fund to support developers and projects building on Solana",
            date=datetime.utcnow(),
            url="https://solana.com/news/ecosystem-fund",
            type="announcement"
        )
    ]
