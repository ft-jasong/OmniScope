"""
지갑 주소 처리를 위한 유틸리티 함수
"""

from solders.pubkey import Pubkey
import base58
from typing import Optional

def normalize_address(address: str) -> str:
    """
    Solana 지갑 주소를 정규화합니다.
    
    Args:
        address: Solana 지갑 주소
        
    Returns:
        정규화된 Solana 지갑 주소
    """
    if not address:
        return ""
    
    try:
        # 유효한 Solana 주소인지 확인하고 정규화
        pubkey = Pubkey.from_string(address)
        return str(pubkey)
    except:
        # 변환 실패 시 원래 주소 반환
        return address

def checksum_address(address: str) -> str:
    """
    Solana 지갑 주소를 반환합니다. (Solana는 체크섬 형식이 없으므로 그대로 반환)
    
    Args:
        address: Solana 지갑 주소
        
    Returns:
        Solana 지갑 주소
    """
    if not address:
        return ""
    
    try:
        # 유효한 Solana 주소인지 확인
        pubkey = Pubkey.from_string(address)
        return str(pubkey)
    except:
        # 변환 실패 시 원래 주소 반환
        return address

def is_valid_address(address: str) -> bool:
    """
    Solana 지갑 주소가 유효한지 확인합니다.
    
    Args:
        address: Solana 지갑 주소
        
    Returns:
        유효한 주소인지 여부
    """
    if not address:
        return False
    
    try:
        # Solana 주소 형식 검증
        Pubkey.from_string(address)
        return True
    except:
        return False
