"""
HashScope LangChain Tools

This module provides LangChain tools for interacting with the HashScope API.
"""

from typing import Dict, Any, List, Optional
from langchain.tools import BaseTool, StructuredTool, Tool
from langchain.pydantic_v1 import BaseModel, Field
from .hashscope_client import HashScopeClient

class HashScopeToolkit:
    """
    Toolkit for HashScope API tools.
    """
    
    def __init__(self, api_key_id: str, api_key_secret: str, base_url: str = "https://hashkey.sungwoonsong.com"):
        """
        Initialize the HashScope toolkit.
        
        Args:
            api_key_id: The API key ID
            api_key_secret: The API key secret
            base_url: The base URL for the HashScope API (default: https://hashkey.sungwoonsong.com)
        """
        self.client = HashScopeClient(api_key_id, api_key_secret, base_url)
        
    def get_tools(self) -> List[BaseTool]:
        """
        Get all available HashScope tools.
        
        Returns:
            A list of LangChain tools
        """
        return [
            get_btc_usd_tool(self.client),
            get_btc_krw_tool(self.client),
            get_usdt_krw_tool(self.client),
            get_kimchi_premium_tool(self.client),
            get_trump_posts_tool(self.client),
            get_elon_posts_tool(self.client),
            get_x_trends_tool(self.client),
            get_funding_rates_tool(self.client),
            get_open_interest_tool(self.client),
            get_hsk_updates_tool(self.client),
            get_ethereum_standards_tool(self.client),
            get_solana_updates_tool(self.client),
            get_bitcoin_activity_tool(self.client),
            get_ethereum_activity_tool(self.client),
        ]


# Tool Definitions for Cryptocurrency Data
def get_btc_usd_tool(client: HashScopeClient) -> BaseTool:
    """Create a tool for getting BTC/USD price."""
    
    def _run() -> str:
        try:
            result = client.get_btc_usd()
            return f"Current price of BTC is {result['price']} USD. Last updated: {result['timestamp']}"
        except Exception as e:
            return f"Error fetching BTC/USD price: {str(e)}"
    
    return Tool.from_function(
        func=_run,
        name="get_btc_usd_price",
        description="Get the current BTC price in USD from Binance.",
    )

def get_btc_krw_tool(client: HashScopeClient) -> BaseTool:
    """Create a tool for getting BTC/KRW price."""
    
    def _run() -> str:
        try:
            result = client.get_btc_krw()
            return f"Current price of BTC is {result['price']} KRW. Last updated: {result['timestamp']}"
        except Exception as e:
            return f"Error fetching BTC/KRW price: {str(e)}"
    
    return Tool.from_function(
        func=_run,
        name="get_btc_krw_price",
        description="Get the current BTC price in KRW from Upbit.",
    )

def get_usdt_krw_tool(client: HashScopeClient) -> BaseTool:
    """Create a tool for getting USDT/KRW price."""
    
    def _run() -> str:
        try:
            result = client.get_usdt_krw()
            return f"Current price of USDT is {result['price']} KRW. Last updated: {result['timestamp']}"
        except Exception as e:
            return f"Error fetching USDT/KRW price: {str(e)}"
    
    return Tool.from_function(
        func=_run,
        name="get_usdt_krw_price",
        description="Get the current USDT price in KRW from Upbit.",
    )

def get_kimchi_premium_tool(client: HashScopeClient) -> BaseTool:
    """Create a tool for getting kimchi premium."""
    
    def _run() -> str:
        try:
            result = client.get_kimchi_premium()
            return f"Current kimchi premium is {result['premium']}%. BTC/USD: ${result['btc_usd']}, BTC/KRW: ₩{result['btc_krw']}, USDT/KRW: ₩{result['usdt_krw']}"
        except Exception as e:
            return f"Error fetching kimchi premium: {str(e)}"
    
    return Tool.from_function(
        func=_run,
        name="get_kimchi_premium",
        description="Get the kimchi premium percentage between Korean and global markets.",
    )

# Tool Definitions for Social Media
def get_trump_posts_tool(client: HashScopeClient) -> BaseTool:
    """Create a tool for getting Trump's latest posts."""
    
    def _run() -> str:
        try:
            posts = client.get_trump_posts()
            response = "Donald Trump's latest posts from Truth Social:\n\n"
            
            for i, post in enumerate(posts, 1):
                response += f"{i}. [{post['timestamp']}] {post['content']}\n"
                response += f"   Likes: {post['likes']}, Reposts: {post['reposts']}\n\n"
            
            return response
        except Exception as e:
            return f"Error fetching Trump's posts: {str(e)}"
    
    return Tool.from_function(
        func=_run,
        name="get_trump_posts",
        description="Get Donald Trump's latest posts from Truth Social.",
    )

def get_elon_posts_tool(client: HashScopeClient) -> BaseTool:
    """Create a tool for getting Elon Musk's latest posts."""
    
    def _run() -> str:
        try:
            posts = client.get_elon_posts()
            response = "Elon Musk's latest posts from X (Twitter):\n\n"
            
            for i, post in enumerate(posts, 1):
                response += f"{i}. [{post['timestamp']}] {post['content']}\n"
                response += f"   Likes: {post['likes']}, Reposts: {post['reposts']}\n\n"
            
            return response
        except Exception as e:
            return f"Error fetching Elon Musk's posts: {str(e)}"
    
    return Tool.from_function(
        func=_run,
        name="get_elon_posts",
        description="Get Elon Musk's latest posts from X (Twitter).",
    )

def get_x_trends_tool(client: HashScopeClient) -> BaseTool:
    """Create a tool for getting X (Twitter) trends."""
    
    def _run() -> str:
        try:
            trends = client.get_x_trends()
            response = "Current trending topics on X (Twitter):\n\n"
            
            for i, trend in enumerate(trends, 1):
                response += f"{i}. {trend['name']} - {trend['tweet_count']} tweets\n"
                response += f"   Category: {trend['category']}\n\n"
            
            return response
        except Exception as e:
            return f"Error fetching X trends: {str(e)}"
    
    return Tool.from_function(
        func=_run,
        name="get_x_trends",
        description="Get current trending topics on X (Twitter).",
    )

# Tool Definitions for Derivatives Market
def get_funding_rates_tool(client: HashScopeClient) -> BaseTool:
    """Create a tool for getting funding rates."""
    
    def _run() -> str:
        try:
            rates = client.get_funding_rates()
            response = "Current funding rates for major cryptocurrency futures markets:\n\n"
            
            for i, rate in enumerate(rates, 1):
                response += f"{i}. {rate['symbol']} on {rate['exchange']}: {rate['rate']*100:.4f}%\n"
                response += f"   Next funding time: {rate['next_funding_time']}, Interval: {rate['interval']}\n\n"
            
            return response
        except Exception as e:
            return f"Error fetching funding rates: {str(e)}"
    
    return Tool.from_function(
        func=_run,
        name="get_funding_rates",
        description="Get current funding rates for major cryptocurrency futures markets.",
    )

def get_open_interest_tool(client: HashScopeClient) -> BaseTool:
    """Create a tool for getting open interest data."""
    
    def _run() -> str:
        try:
            data = client.get_open_interest()
            response = "Open interest ratios for major cryptocurrency derivatives:\n\n"
            
            for i, item in enumerate(data, 1):
                response += f"{i}. {item['symbol']} on {item['exchange']}:\n"
                response += f"   Open Interest: {item['open_interest']} coins (${item['open_interest_usd']:,.2f})\n"
                response += f"   24h Change: {item['change_24h']}%\n\n"
            
            return response
        except Exception as e:
            return f"Error fetching open interest data: {str(e)}"
    
    return Tool.from_function(
        func=_run,
        name="get_open_interest",
        description="Get open interest ratios for major cryptocurrency derivatives.",
    )

# Tool Definitions for Blockchain Projects
def get_hsk_updates_tool(client: HashScopeClient) -> BaseTool:
    """Create a tool for getting HashKey Chain updates."""
    
    def _run() -> str:
        try:
            updates = client.get_hsk_updates()
            response = "Latest updates and developments from HashKey Chain:\n\n"
            
            for i, update in enumerate(updates, 1):
                response += f"{i}. {update['title']}\n"
                response += f"   Date: {update['date']}\n"
                response += f"   Type: {update['type']}\n"
                response += f"   Description: {update['description']}\n\n"
            
            return response
        except Exception as e:
            return f"Error fetching HSK updates: {str(e)}"
    
    return Tool.from_function(
        func=_run,
        name="get_hsk_updates",
        description="Get latest updates and developments from HashKey Chain.",
    )

def get_ethereum_standards_tool(client: HashScopeClient) -> BaseTool:
    """Create a tool for getting Ethereum standards information."""
    
    def _run() -> str:
        try:
            standards = client.get_ethereum_standards()
            response = "Information about new Ethereum standards and proposals:\n\n"
            
            for i, standard in enumerate(standards, 1):
                response += f"{i}. EIP-{standard['eip_number']}: {standard['title']}\n"
                response += f"   Status: {standard['status']}, Type: {standard['type']}, Category: {standard['category']}\n"
                response += f"   Author: {standard['author']}, Created: {standard['created']}\n"
                response += f"   Description: {standard['description']}\n\n"
            
            return response
        except Exception as e:
            return f"Error fetching Ethereum standards: {str(e)}"
    
    return Tool.from_function(
        func=_run,
        name="get_ethereum_standards",
        description="Get information about new Ethereum standards and proposals.",
    )

def get_solana_updates_tool(client: HashScopeClient) -> BaseTool:
    """Create a tool for getting Solana updates."""
    
    def _run() -> str:
        try:
            updates = client.get_solana_updates()
            response = "Latest updates and developments from Solana blockchain:\n\n"
            
            for i, update in enumerate(updates, 1):
                response += f"{i}. {update['title']}\n"
                response += f"   Date: {update['date']}\n"
                response += f"   Type: {update['type']}\n"
                response += f"   Description: {update['description']}\n\n"
            
            return response
        except Exception as e:
            return f"Error fetching Solana updates: {str(e)}"
    
    return Tool.from_function(
        func=_run,
        name="get_solana_updates",
        description="Get latest updates and developments from Solana blockchain.",
    )

# Tool Definitions for Open Source
def get_bitcoin_activity_tool(client: HashScopeClient) -> BaseTool:
    """Create a tool for getting Bitcoin Core repository activity."""
    
    def _run() -> str:
        try:
            activity = client.get_bitcoin_activity()
            stats = activity['stats']
            prs = activity['pull_requests']
            
            response = "Latest activities from Bitcoin Core repository:\n\n"
            response += f"Repository Stats:\n"
            response += f"- Stars: {stats['stars']:,}\n"
            response += f"- Forks: {stats['forks']:,}\n"
            response += f"- Open Issues: {stats['open_issues']:,}\n"
            response += f"- Last Commit: {stats['last_commit']}\n"
            response += f"- Release Version: {stats['release_version']}\n\n"
            
            response += f"Recent Pull Requests:\n"
            for i, pr in enumerate(prs, 1):
                response += f"{i}. {pr['title']} (#{pr['id']})\n"
                response += f"   Author: {pr['author']}, State: {pr['state']}\n"
                response += f"   Created: {pr['created_at']}, Comments: {pr['comments']}\n"
                response += f"   Changes: +{pr['additions']}, -{pr['deletions']}\n\n"
            
            return response
        except Exception as e:
            return f"Error fetching Bitcoin Core activity: {str(e)}"
    
    return Tool.from_function(
        func=_run,
        name="get_bitcoin_activity",
        description="Get latest pull requests, stars, and activities from Bitcoin Core repository.",
    )

def get_ethereum_activity_tool(client: HashScopeClient) -> BaseTool:
    """Create a tool for getting Ethereum Core repositories activity."""
    
    def _run() -> str:
        try:
            activity = client.get_ethereum_activity()
            
            response = "Latest activities from Ethereum Core repositories:\n\n"
            
            # Go-Ethereum
            go_eth = activity['go-ethereum']
            response += f"Go-Ethereum Repository:\n"
            response += f"- Stars: {go_eth['stats']['stars']:,}\n"
            response += f"- Forks: {go_eth['stats']['forks']:,}\n"
            response += f"- Open Issues: {go_eth['stats']['open_issues']:,}\n"
            response += f"- Release Version: {go_eth['stats']['release_version']}\n\n"
            
            response += f"Recent Pull Requests:\n"
            for i, pr in enumerate(go_eth['pull_requests'], 1):
                response += f"{i}. {pr['title']} (#{pr['id']})\n"
                response += f"   Author: {pr['author']}, State: {pr['state']}\n\n"
            
            # Consensus-Specs
            cons_specs = activity['consensus-specs']
            response += f"\nConsensus-Specs Repository:\n"
            response += f"- Stars: {cons_specs['stats']['stars']:,}\n"
            response += f"- Forks: {cons_specs['stats']['forks']:,}\n"
            response += f"- Open Issues: {cons_specs['stats']['open_issues']:,}\n"
            response += f"- Release Version: {cons_specs['stats']['release_version']}\n\n"
            
            response += f"Recent Pull Requests:\n"
            for i, pr in enumerate(cons_specs['pull_requests'], 1):
                response += f"{i}. {pr['title']} (#{pr['id']})\n"
                response += f"   Author: {pr['author']}, State: {pr['state']}\n\n"
            
            return response
        except Exception as e:
            return f"Error fetching Ethereum Core activity: {str(e)}"
    
    return Tool.from_function(
        func=_run,
        name="get_ethereum_activity",
        description="Get latest pull requests, stars, and activities from Ethereum Core repositories.",
    )
