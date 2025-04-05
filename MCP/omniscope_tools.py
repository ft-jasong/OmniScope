"""
OmniScope LangChain Tools

This module provides LangChain tools for interacting with the OmniScope API.
"""

from typing import Dict, Any, List, Optional
from langchain.tools import BaseTool, StructuredTool, Tool
from pydantic import BaseModel, Field
from omniscope_client import OmniScopeClient
import json

class OmniScopeToolkit:
    """
    Toolkit for OmniScope API tools.
    """
    
    def __init__(self, api_key_id: str, api_key_secret: str, base_url: str = "https://omniscope.sungwoonsong.com"):
        """
        Initialize the OmniScope toolkit.
        
        Args:
            api_key_id: The API key ID
            api_key_secret: The API key secret
            base_url: The base URL for the OmniScope API (default: https://omniscope.sungwoonsong.com)
        """
        self.client = OmniScopeClient(api_key_id, api_key_secret, base_url)
        self._api_catalog = None
        self._categories = None
        
    def get_tools(self) -> List[BaseTool]:
        """
        Get all available OmniScope tools.
        
        Returns:
            A list of LangChain tools
        """
        # 기본 도구 목록
        tools = [
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
        
        # 동적으로 API 카탈로그에서 추가 도구 생성
        dynamic_tools = self.get_dynamic_tools()
        tools.extend(dynamic_tools)
        
        return tools
    
    def get_dynamic_tools(self) -> List[BaseTool]:
        """
        Dynamically generate tools from the API catalog.
        
        Returns:
            A list of dynamically generated LangChain tools
        """
        try:
            # API 카탈로그 가져오기
            if self._api_catalog is None:
                self._api_catalog = self.client.get_api_catalog()
            
            tools = []
            
            # API 카탈로그에서 각 API에 대한 도구 생성
            for api in self._api_catalog.get('apis', []):
                # 이미 기본 도구로 구현된 API는 건너뛰기
                if self._is_predefined_api(api['path']):
                    continue
                
                # API 경로에서 도구 이름 생성
                tool_name = self._generate_tool_name(api['path'])
                
                # 도구 생성
                tool = self._create_dynamic_tool(api, tool_name)
                tools.append(tool)
            
            return tools
        except Exception as e:
            print(f"Error generating dynamic tools: {str(e)}")
            return []
    
    def _is_predefined_api(self, path: str) -> bool:
        """
        Check if the API is already implemented as a predefined tool.
        
        Args:
            path: The API path
            
        Returns:
            True if the API is already implemented, False otherwise
        """
        predefined_paths = [
            '/crypto/btc/usd',
            '/crypto/btc/krw',
            '/crypto/usdt/krw',
            '/crypto/kimchi-premium',
            '/social/trump',
            '/social/elon',
            '/social/x-trends',
            '/derivatives/funding-rates',
            '/derivatives/open-interest',
            '/projects/hsk',
            '/projects/ethereum-standards',
            '/projects/solana',
            '/opensource/bitcoin',
            '/opensource/ethereum'
        ]
        return path in predefined_paths
    
    def _generate_tool_name(self, path: str) -> str:
        """
        Generate a tool name from an API path.
        
        Args:
            path: The API path
            
        Returns:
            A tool name
        """
        # 경로에서 슬래시 제거하고 언더스코어로 변환
        name = path.strip('/').replace('/', '_').replace('-', '_')
        return f"get_{name}"
    
    def _create_dynamic_tool(self, api: Dict[str, Any], tool_name: str) -> BaseTool:
        """
        Create a dynamic tool for an API.
        
        Args:
            api: The API information
            tool_name: The tool name
            
        Returns:
            A LangChain tool
        """
        path = api['path']
        method = api['method'].lower()
        summary = api.get('summary', f"Get data from {path}")
        description = api.get('description', summary)
        
        def _run() -> str:
            try:
                result = self.client._make_request(method, path)
                return json.dumps(result, indent=2)
            except Exception as e:
                return f"Error calling {path}: {str(e)}"
        
        return Tool.from_function(
            func=_run,
            name=tool_name,
            description=f"{summary}. {description}",
        )
    
    def get_categories(self) -> List[str]:
        """
        Get available API categories.
        
        Returns:
            A list of API categories
        """
        try:
            if self._categories is None:
                result = self.client.get_categories()
                self._categories = result.get('categories', [])
            return self._categories
        except Exception as e:
            print(f"Error fetching API categories: {str(e)}")
            return []
    
    def get_tools_by_category(self, category: str) -> List[BaseTool]:
        """
        Get tools for a specific category.
        
        Args:
            category: The API category
            
        Returns:
            A list of LangChain tools for the category
        """
        try:
            # 카테고리별 API 목록 가져오기
            api_catalog = self.client.get_api_catalog(category=category)
            
            tools = []
            
            # 카테고리의 각 API에 대한 도구 생성
            for api in api_catalog.get('apis', []):
                # API 경로에서 도구 이름 생성
                tool_name = self._generate_tool_name(api['path'])
                
                # 도구 생성
                tool = self._create_dynamic_tool(api, tool_name)
                tools.append(tool)
            
            return tools
        except Exception as e:
            print(f"Error generating tools for category {category}: {str(e)}")
            return []


# Tool Definitions for Cryptocurrency Data
def get_btc_usd_tool(client: OmniScopeClient) -> BaseTool:
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

def get_btc_krw_tool(client: OmniScopeClient) -> BaseTool:
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

def get_usdt_krw_tool(client: OmniScopeClient) -> BaseTool:
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

def get_kimchi_premium_tool(client: OmniScopeClient) -> BaseTool:
    """Create a tool for getting Kimchi Premium."""
    
    def _run() -> str:
        try:
            result = client.get_kimchi_premium()
            return f"Current Kimchi Premium is {result['premium']}%. BTC/USD: ${result['btc_usd']}, BTC/KRW: ₩{result['btc_krw']}, USDT/KRW: ₩{result['usdt_krw']}. Last updated: {result['timestamp']}"
        except Exception as e:
            return f"Error fetching Kimchi Premium: {str(e)}"
    
    return Tool.from_function(
        func=_run,
        name="get_kimchi_premium",
        description="Get the current Kimchi Premium (difference between BTC price in KRW and USD).",
    )

# Tool Definitions for Social Media
def get_trump_posts_tool(client: OmniScopeClient) -> BaseTool:
    """Create a tool for getting Trump's latest posts."""
    
    def _run() -> str:
        try:
            result = client.get_trump_posts()
            posts = result.get('posts', [])
            if not posts:
                return "No recent posts from Donald Trump."
            
            response = "Latest posts from Donald Trump:\n\n"
            for i, post in enumerate(posts[:5], 1):
                response += f"{i}. [{post['date']}] {post['content']}\n\n"
            
            return response
        except Exception as e:
            return f"Error fetching Trump's posts: {str(e)}"
    
    return Tool.from_function(
        func=_run,
        name="get_trump_posts",
        description="Get the latest posts from Donald Trump on social media.",
    )

def get_elon_posts_tool(client: OmniScopeClient) -> BaseTool:
    """Create a tool for getting Elon Musk's latest posts."""
    
    def _run() -> str:
        try:
            result = client.get_elon_posts()
            posts = result.get('posts', [])
            if not posts:
                return "No recent posts from Elon Musk."
            
            response = "Latest posts from Elon Musk:\n\n"
            for i, post in enumerate(posts[:5], 1):
                response += f"{i}. [{post['date']}] {post['content']}\n\n"
            
            return response
        except Exception as e:
            return f"Error fetching Elon Musk's posts: {str(e)}"
    
    return Tool.from_function(
        func=_run,
        name="get_elon_posts",
        description="Get the latest posts from Elon Musk on social media.",
    )

def get_x_trends_tool(client: OmniScopeClient) -> BaseTool:
    """Create a tool for getting X (Twitter) trends."""
    
    def _run() -> str:
        try:
            result = client.get_x_trends()
            trends = result.get('trends', [])
            if not trends:
                return "No trending topics available."
            
            response = "Current trending topics on X (Twitter):\n\n"
            for i, trend in enumerate(trends[:10], 1):
                response += f"{i}. {trend['name']} - {trend['tweet_volume']} tweets\n"
            
            return response
        except Exception as e:
            return f"Error fetching X trends: {str(e)}"
    
    return Tool.from_function(
        func=_run,
        name="get_x_trends",
        description="Get the current trending topics on X (Twitter).",
    )

# Tool Definitions for Derivatives Market
def get_funding_rates_tool(client: OmniScopeClient) -> BaseTool:
    """Create a tool for getting funding rates."""
    
    def _run() -> str:
        try:
            result = client.get_funding_rates()
            rates = result.get('funding_rates', [])
            if not rates:
                return "No funding rate data available."
            
            response = "Current funding rates for cryptocurrency futures:\n\n"
            for rate in rates[:10]:
                response += f"{rate['symbol']}: {rate['rate']}% ({rate['exchange']})\n"
            
            return response
        except Exception as e:
            return f"Error fetching funding rates: {str(e)}"
    
    return Tool.from_function(
        func=_run,
        name="get_funding_rates",
        description="Get the current funding rates for cryptocurrency futures.",
    )

def get_open_interest_tool(client: OmniScopeClient) -> BaseTool:
    """Create a tool for getting open interest data."""
    
    def _run() -> str:
        try:
            result = client.get_open_interest()
            data = result.get('open_interest', [])
            if not data:
                return "No open interest data available."
            
            response = "Current open interest for cryptocurrency derivatives:\n\n"
            for item in data[:10]:
                response += f"{item['symbol']}: {item['value']} {item['unit']} ({item['exchange']})\n"
            
            response += f"\nLast updated: {result.get('timestamp', 'N/A')}"
            return response
        except Exception as e:
            return f"Error fetching open interest data: {str(e)}"
    
    return Tool.from_function(
        func=_run,
        name="get_open_interest",
        description="Get the current open interest for cryptocurrency derivatives.",
    )

# Tool Definitions for Blockchain Projects
def get_hsk_updates_tool(client: OmniScopeClient) -> BaseTool:
    """Create a tool for getting HashKey Chain updates."""
    
    def _run() -> str:
        try:
            result = client.get_hsk_updates()
            updates = result.get('updates', [])
            if not updates:
                return "No recent updates from HashKey Chain."
            
            response = "Latest updates from HashKey Chain:\n\n"
            for i, update in enumerate(updates[:5], 1):
                response += f"{i}. [{update['date']}] {update['title']}\n"
                response += f"   {update['summary']}\n\n"
            
            return response
        except Exception as e:
            return f"Error fetching HashKey Chain updates: {str(e)}"
    
    return Tool.from_function(
        func=_run,
        name="get_hsk_updates",
        description="Get the latest updates from HashKey Chain.",
    )

def get_ethereum_standards_tool(client: OmniScopeClient) -> BaseTool:
    """Create a tool for getting Ethereum standards information."""
    
    def _run() -> str:
        try:
            result = client.get_ethereum_standards()
            standards = result.get('standards', [])
            if not standards:
                return "No Ethereum standards information available."
            
            response = "Ethereum standards and proposals:\n\n"
            for i, standard in enumerate(standards[:5], 1):
                response += f"{i}. {standard['id']}: {standard['title']}\n"
                response += f"   Status: {standard['status']}\n"
                response += f"   {standard['summary']}\n\n"
            
            return response
        except Exception as e:
            return f"Error fetching Ethereum standards information: {str(e)}"
    
    return Tool.from_function(
        func=_run,
        name="get_ethereum_standards",
        description="Get information about Ethereum standards and proposals.",
    )

def get_solana_updates_tool(client: OmniScopeClient) -> BaseTool:
    """Create a tool for getting Solana updates."""
    
    def _run() -> str:
        try:
            result = client.get_solana_updates()
            updates = result.get('updates', [])
            if not updates:
                return "No recent updates from Solana blockchain."
            
            response = "Latest updates from Solana blockchain:\n\n"
            for i, update in enumerate(updates[:5], 1):
                response += f"{i}. [{update['date']}] {update['title']}\n"
                response += f"   {update['summary']}\n\n"
            
            return response
        except Exception as e:
            return f"Error fetching Solana updates: {str(e)}"
    
    return Tool.from_function(
        func=_run,
        name="get_solana_updates",
        description="Get the latest updates from Solana blockchain.",
    )

# Tool Definitions for Open Source
def get_bitcoin_activity_tool(client: OmniScopeClient) -> BaseTool:
    """Create a tool for getting Bitcoin Core repository activity."""
    
    def _run() -> str:
        try:
            result = client.get_bitcoin_activity()
            commits = result.get('commits', [])
            prs = result.get('pull_requests', [])
            issues = result.get('issues', [])
            
            if not commits and not prs and not issues:
                return "No recent activity in Bitcoin Core repository."
            
            response = "Latest activity from Bitcoin Core repository:\n\n"
            
            if commits:
                response += "Recent commits:\n"
                for i, commit in enumerate(commits[:3], 1):
                    response += f"{i}. [{commit['date']}] {commit['message']} by {commit['author']}\n"
                response += "\n"
            
            if prs:
                response += "Recent pull requests:\n"
                for i, pr in enumerate(prs[:3], 1):
                    response += f"{i}. #{pr['number']} {pr['title']} by {pr['author']} ({pr['state']})\n"
                response += "\n"
            
            if issues:
                response += "Recent issues:\n"
                for i, issue in enumerate(issues[:3], 1):
                    response += f"{i}. #{issue['number']} {issue['title']} by {issue['author']} ({issue['state']})\n"
            
            return response
        except Exception as e:
            return f"Error fetching Bitcoin Core repository activity: {str(e)}"
    
    return Tool.from_function(
        func=_run,
        name="get_bitcoin_activity",
        description="Get the latest activities from Bitcoin Core repository.",
    )

def get_ethereum_activity_tool(client: OmniScopeClient) -> BaseTool:
    """Create a tool for getting Ethereum Core repositories activity."""
    
    def _run() -> str:
        try:
            result = client.get_ethereum_activity()
            repos = result.get('repositories', [])
            
            if not repos:
                return "No recent activity in Ethereum Core repositories."
            
            response = "Latest activity from Ethereum Core repositories:\n\n"
            
            for repo in repos[:3]:
                response += f"Repository: {repo['name']}\n"
                
                commits = repo.get('commits', [])
                if commits:
                    response += "  Recent commits:\n"
                    for i, commit in enumerate(commits[:2], 1):
                        response += f"  {i}. [{commit['date']}] {commit['message']} by {commit['author']}\n"
                
                prs = repo.get('pull_requests', [])
                if prs:
                    response += "  Recent pull requests:\n"
                    for i, pr in enumerate(prs[:2], 1):
                        response += f"  {i}. #{pr['number']} {pr['title']} by {pr['author']} ({pr['state']})\n"
                
                response += "\n"
            
            return response
        except Exception as e:
            return f"Error fetching Ethereum Core repositories activity: {str(e)}"
    
    return Tool.from_function(
        func=_run,
        name="get_ethereum_activity",
        description="Get the latest activities from Ethereum Core repositories.",
    )
