"""
OmniScope API Client

This module provides a client for interacting with the OmniScope API.
"""

import requests
from typing import Dict, Any, Optional, List, Union
import json

class OmniScopeClient:
    """
    Client for interacting with the OmniScope API.
    """
    
    def __init__(self, api_key_id: str, api_key_secret: str, base_url: str = "https://omniscope.sungwoonsong.com/api"):
        """
        Initialize the OmniScope API client.
        
        Args:
            api_key_id: The API key ID
            api_key_secret: The API key secret
            base_url: The base URL for the OmniScope API (default: https://omniscope.sungwoonsong.com/api)
        """
        self.api_key_id = api_key_id
        self.api_key_secret = api_key_secret
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        self.session.headers.update({
            'api-key-id': api_key_id,
            'api-key-secret': api_key_secret,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
    
    def _make_request(self, method: str, endpoint: str, params: Optional[Dict[str, Any]] = None, 
                     data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Make a request to the OmniScope API.
        
        Args:
            method: The HTTP method to use
            endpoint: The API endpoint
            params: Query parameters
            data: Request body data
            
        Returns:
            The API response as a dictionary
        """
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        
        try:
            if method.lower() == 'get':
                response = self.session.get(url, params=params)
            elif method.lower() == 'post':
                response = self.session.post(url, params=params, json=data)
            elif method.lower() == 'put':
                response = self.session.put(url, params=params, json=data)
            elif method.lower() == 'delete':
                response = self.session.delete(url, params=params, json=data)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
            
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            if hasattr(e, 'response') and e.response is not None:
                try:
                    error_data = e.response.json()
                    error_message = error_data.get('detail', str(e))
                except ValueError:
                    error_message = e.response.text or str(e)
            else:
                error_message = str(e)
            
            raise Exception(f"OmniScope API error: {error_message}")
    
    # Crypto Price API
    def get_btc_usd(self) -> Dict[str, Any]:
        """
        Get the current BTC price in USD from Binance.
        
        Returns:
            The current BTC/USD price data
        """
        return self._make_request('get', '/crypto/btc/usd')
    
    def get_btc_krw(self) -> Dict[str, Any]:
        """
        Get the current BTC price in KRW from Upbit.
        
        Returns:
            The current BTC/KRW price data
        """
        return self._make_request('get', '/crypto/btc/krw')
    
    def get_usdt_krw(self) -> Dict[str, Any]:
        """
        Get the current USDT price in KRW from Upbit.
        
        Returns:
            The current USDT/KRW price data
        """
        return self._make_request('get', '/crypto/usdt/krw')
    
    def get_kimchi_premium(self) -> Dict[str, Any]:
        """
        Get the current Kimchi Premium (difference between BTC price in KRW and USD).
        
        Returns:
            The current Kimchi Premium data
        """
        return self._make_request('get', '/crypto/kimchi-premium')
    
    # Social Media API
    def get_trump_posts(self) -> Dict[str, Any]:
        """
        Get the latest posts from Donald Trump.
        
        Returns:
            The latest posts from Donald Trump
        """
        return self._make_request('get', '/social/trump')
    
    def get_elon_posts(self) -> Dict[str, Any]:
        """
        Get the latest posts from Elon Musk.
        
        Returns:
            The latest posts from Elon Musk
        """
        return self._make_request('get', '/social/elon')
    
    def get_x_trends(self) -> Dict[str, Any]:
        """
        Get the current trending topics on X (Twitter).
        
        Returns:
            The current trending topics on X
        """
        return self._make_request('get', '/social/x-trends')
    
    # Derivatives Market API
    def get_funding_rates(self) -> Dict[str, Any]:
        """
        Get the current funding rates for cryptocurrency futures.
        
        Returns:
            The current funding rates data
        """
        return self._make_request('get', '/derivatives/funding-rates')
    
    def get_open_interest(self) -> Dict[str, Any]:
        """
        Get the current open interest for cryptocurrency derivatives.
        
        Returns:
            The current open interest data
        """
        return self._make_request('get', '/derivatives/open-interest')
    
    # Blockchain Projects API
    def get_hsk_updates(self) -> Dict[str, Any]:
        """
        Get the latest updates from HashKey Chain.
        
        Returns:
            The latest updates from HashKey Chain
        """
        return self._make_request('get', '/projects/hsk')
    
    def get_ethereum_standards(self) -> Dict[str, Any]:
        """
        Get information about Ethereum standards and proposals.
        
        Returns:
            Information about Ethereum standards and proposals
        """
        return self._make_request('get', '/projects/ethereum-standards')
    
    def get_solana_updates(self) -> Dict[str, Any]:
        """
        Get the latest updates from Solana blockchain.
        
        Returns:
            The latest updates from Solana blockchain
        """
        return self._make_request('get', '/projects/solana')
    
    # Open Source API
    def get_bitcoin_activity(self) -> Dict[str, Any]:
        """
        Get the latest activities from Bitcoin Core.
        
        Returns:
            Latest activities from Bitcoin Core
        """
        return self._make_request('get', '/opensource/bitcoin')
    
    def get_ethereum_activity(self) -> Dict[str, Any]:
        """
        Get the latest activities from Ethereum Core.
        
        Returns:
            Latest activities from Ethereum Core
        """
        return self._make_request('get', '/opensource/ethereum')
    
    # API Catalog
    def get_api_catalog(self, category: Optional[str] = None) -> Dict[str, Any]:
        """
        Get the API catalog from OmniScope.
        
        Args:
            category: Optional category to filter APIs
            
        Returns:
            The API catalog data
        """
        params = {}
        if category:
            params['category'] = category
        return self._make_request('get', '/api-catalog', params=params)
    
    def get_categories(self) -> Dict[str, Any]:
        """
        Get the available API categories from OmniScope.
        
        Returns:
            The API categories data
        """
        return self._make_request('get', '/api-catalog/categories')
