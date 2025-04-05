"""
OmniScope MCP - LangChain Tool Integration

This package provides tools for integrating OmniScope API with LangChain.
"""

import os
from typing import Optional

from .omniscope_client import OmniScopeClient
from .omniscope_tools import (
    OmniScopeToolkit,
    get_btc_usd_tool,
    get_btc_krw_tool,
    get_usdt_krw_tool,
    get_kimchi_premium_tool,
    get_trump_posts_tool,
    get_elon_posts_tool,
    get_x_trends_tool,
    get_funding_rates_tool,
    get_open_interest_tool,
    get_hsk_updates_tool,
    get_ethereum_standards_tool,
    get_solana_updates_tool,
    get_bitcoin_activity_tool,
    get_ethereum_activity_tool,
)

def create_toolkit_from_env(base_url: Optional[str] = None) -> OmniScopeToolkit:
    """
    Create a OmniScopeToolkit instance from environment variables.
    
    Environment variables:
    - OMNISCOPE_API_KEY_ID: The API key ID
    - OMNISCOPE_API_KEY_SECRET: The API key secret
    
    Args:
        base_url: Optional base URL for the OmniScope API
        
    Returns:
        A OmniScopeToolkit instance
    """
    api_key_id = os.environ.get("OMNISCOPE_API_KEY_ID")
    api_key_secret = os.environ.get("OMNISCOPE_API_KEY_SECRET")
    
    if not api_key_id or not api_key_secret:
        raise ValueError(
            "OMNISCOPE_API_KEY_ID and OMNISCOPE_API_KEY_SECRET environment variables must be set"
        )
    
    return OmniScopeToolkit(
        api_key_id=api_key_id,
        api_key_secret=api_key_secret,
        base_url=base_url or "https://omniscope.sungwoonsong.com"
    )

__all__ = [
    "OmniScopeToolkit",
    "OmniScopeClient",
    "create_toolkit_from_env",
    "get_btc_usd_tool",
    "get_btc_krw_tool",
    "get_usdt_krw_tool",
    "get_kimchi_premium_tool",
    "get_trump_posts_tool",
    "get_elon_posts_tool",
    "get_x_trends_tool",
    "get_funding_rates_tool",
    "get_open_interest_tool",
    "get_hsk_updates_tool",
    "get_ethereum_standards_tool",
    "get_solana_updates_tool",
    "get_bitcoin_activity_tool",
    "get_ethereum_activity_tool",
]
