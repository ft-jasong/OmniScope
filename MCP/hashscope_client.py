"""
HashScope API Client

This module provides a client for interacting with the HashScope API.
"""

import requests
from typing import Dict, Any, Optional, List, Union
import json

class HashScopeClient:
    """
    Client for interacting with the HashScope API.
    """
    
    def __init__(self, api_key_id: str, api_key_secret: str, base_url: str = "https://hashkey.sungwoonsong.com/api"):
        """
        Initialize the HashScope API client.
        
        Args:
            api_key_id: The API key ID
            api_key_secret: The API key secret
            base_url: The base URL for the HashScope API (default: https://hashkey.sungwoonsong.com/api)
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
        Make a request to the HashScope API.
        
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
            
            raise Exception(f"HashScope API error: {error_message}")
    
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
        Get the kimchi premium percentage between Korean and global markets.
        
        Returns:
            The current kimchi premium data
        """
        return self._make_request('get', '/crypto/kimchi-premium')
    
    # Social Media API
    def get_trump_posts(self) -> Dict[str, Any]:
        """
        Get Donald Trump's latest posts from Truth Social.
        
        Returns:
            Latest posts from Donald Trump
        """
        return self._make_request('get', '/social/trump')
    
    def get_elon_posts(self) -> Dict[str, Any]:
        """
        Get Elon Musk's latest posts from X (Twitter).
        
        Returns:
            Latest posts from Elon Musk
        """
        return self._make_request('get', '/social/elon')
    
    def get_x_trends(self) -> Dict[str, Any]:
        """
        Get current trending topics on X (Twitter).
        
        Returns:
            Current trending topics on X
        """
        return self._make_request('get', '/social/x/trends')
    
    # Derivatives Market API
    def get_funding_rates(self) -> Dict[str, Any]:
        """
        Get current funding rates for major cryptocurrency futures markets.
        
        Returns:
            Current funding rates data
        """
        return self._make_request('get', '/derivatives/funding-rates')
    
    def get_open_interest(self) -> Dict[str, Any]:
        """
        Get open interest ratios for major cryptocurrency derivatives.
        
        Returns:
            Open interest data
        """
        return self._make_request('get', '/derivatives/open-interest')
    
    # Blockchain Projects API
    def get_hsk_updates(self) -> Dict[str, Any]:
        """
        Get latest updates and developments from HashKey Chain.
        
        Returns:
            Latest updates from HashKey Chain
        """
        return self._make_request('get', '/projects/hsk')
    
    def get_ethereum_standards(self) -> Dict[str, Any]:
        """
        Get information about new Ethereum standards and proposals.
        
        Returns:
            Information about Ethereum standards
        """
        return self._make_request('get', '/projects/ethereum/standards')
    
    def get_solana_updates(self) -> Dict[str, Any]:
        """
        Get latest updates and developments from Solana blockchain.
        
        Returns:
            Latest updates from Solana blockchain
        """
        return self._make_request('get', '/projects/solana')
    
    # Open Source API
    def get_bitcoin_activity(self) -> Dict[str, Any]:
        """
        Get latest pull requests, stars, and activities from Bitcoin Core repository.
        
        Returns:
            Latest activities from Bitcoin Core
        """
        return self._make_request('get', '/opensource/bitcoin')
    
    def get_ethereum_activity(self) -> Dict[str, Any]:
        """
        Get latest pull requests, stars, and activities from Ethereum Core repositories.
        
        Returns:
            Latest activities from Ethereum Core
        """
        return self._make_request('get', '/opensource/ethereum')
