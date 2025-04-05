import os
import sys
import pytest
from fastapi.testclient import TestClient
import nacl.signing
import base58

# 프로젝트 루트 디렉토리를 Python 경로에 추가
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# 필요한 모듈만 임포트
from app.auth.wallet import create_auth_message, verify_signature, generate_nonce
from solders.pubkey import Pubkey

def generate_random_solana_keypair():
    """테스트용 랜덤 Solana 키페어 생성"""
    # Generate a new random signing key
    signing_key = nacl.signing.SigningKey.generate()
    # Get the verify key (public key)
    verify_key = signing_key.verify_key
    # Convert to Solana Pubkey format
    public_key = Pubkey(bytes(verify_key))
    
    return str(public_key), signing_key

def test_generate_nonce():
    """nonce 생성 테스트"""
    nonce = generate_nonce()
    assert len(nonce) == 32
    assert isinstance(nonce, str)

def test_create_auth_message():
    """인증 메시지 생성 테스트"""
    wallet_address = "8xrt6LGom7d6MxvwQoZtPCGvFPutrk7n6xHWiJDCrNXk"
    nonce = "abcdefghijklmnopqrstuvwxyz123456"
    message = create_auth_message(wallet_address, nonce)
    assert wallet_address in message
    assert nonce in message

def test_verify_signature():
    """서명 검증 테스트"""
    # 테스트용 키페어 생성
    wallet_address, signing_key = generate_random_solana_keypair()
    
    # 메시지 생성
    nonce = generate_nonce()
    message = create_auth_message(wallet_address, nonce)
    
    # 메시지 서명
    signature_bytes = signing_key.sign(message.encode('utf-8')).signature
    signature = base58.b58encode(signature_bytes).decode('utf-8')
    
    # 서명 검증
    assert verify_signature(message, signature, wallet_address) == True

def test_invalid_signature():
    """잘못된 서명 테스트"""
    # 테스트용 키페어 생성
    wallet_address, _ = generate_random_solana_keypair()
    
    # 메시지 생성
    nonce = generate_nonce()
    message = create_auth_message(wallet_address, nonce)
    
    # 잘못된 서명 생성
    random_bytes = os.urandom(64)
    invalid_signature = base58.b58encode(random_bytes).decode('utf-8')
    
    # 서명 검증
    assert verify_signature(message, invalid_signature, wallet_address) == False

if __name__ == "__main__":
    # 테스트 실행
    test_generate_nonce()
    print("✅ nonce 생성 테스트 성공")
    
    test_create_auth_message()
    print("✅ 인증 메시지 생성 테스트 성공")
    
    test_verify_signature()
    print("✅ 서명 검증 테스트 성공")
    
    test_invalid_signature()
    print("✅ 잘못된 서명 테스트 성공")
    
    print("🎉 모든 솔라나 인증 테스트가 성공적으로 완료되었습니다!")
