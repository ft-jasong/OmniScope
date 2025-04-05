"""
HashScope MCP - LangChain Tool Integration

This package provides tools for integrating HashScope API with LangChain.
"""

from .hashscope_tools import (
    HashScopeToolkit,
    get_crypto_price_tool,
    get_crypto_market_data_tool,
    get_crypto_onchain_data_tool,
    get_crypto_social_data_tool,
)

__all__ = [
    "HashScopeToolkit",
    "get_crypto_price_tool",
    "get_crypto_market_data_tool",
    "get_crypto_onchain_data_tool",
    "get_crypto_social_data_tool",
]
