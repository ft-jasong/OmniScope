"""
지갑 주소 처리를 위한 유틸리티 함수
"""

from web3 import Web3
from typing import Optional

def normalize_address(address: str) -> str:
    """
    지갑 주소를 소문자로 정규화합니다.
    
    Args:
        address: 이더리움 지갑 주소
        
    Returns:
        소문자로 정규화된 지갑 주소
    """
    if not address:
        return ""
    
    # 주소 형식 검증 및 0x 접두사 추가
    if not address.startswith('0x'):
        address = '0x' + address
    
    # 소문자로 변환
    return address.lower()

def checksum_address(address: str) -> str:
    """
    지갑 주소를 EIP-55 체크섬 형식으로 변환합니다.
    
    Args:
        address: 이더리움 지갑 주소
        
    Returns:
        체크섬 형식(대소문자 혼합)의 지갑 주소
    """
    if not address:
        return ""
    
    try:
        # Web3 라이브러리를 사용하여 체크섬 주소로 변환
        return Web3.to_checksum_address(address)
    except:
        # 변환 실패 시 원래 주소 반환
        return address

def is_valid_address(address: str) -> bool:
    """
    지갑 주소가 유효한지 확인합니다.
    
    Args:
        address: 이더리움 지갑 주소
        
    Returns:
        유효한 주소인지 여부
    """
    if not address:
        return False
    
    try:
        # 주소 형식 검증
        return Web3.is_address(address)
    except:
        return False
