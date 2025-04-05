import pytest
import os
import sys
from fastapi.testclient import TestClient
import nacl.signing
import base58
import random
import string

# 프로젝트 루트 디렉토리를 Python 경로에 추가
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.auth.wallet import create_auth_message
from solders.pubkey import Pubkey

client = TestClient(app)

def generate_random_solana_keypair():
    """테스트용 랜덤 Solana 키페어 생성"""
    # Generate a new random signing key
    signing_key = nacl.signing.SigningKey.generate()
    # Get the verify key (public key)
    verify_key = signing_key.verify_key
    # Convert to Solana Pubkey format
    public_key = Pubkey(bytes(verify_key))
    
    return str(public_key), signing_key

def test_get_nonce():
    """인증 nonce 요청 테스트"""
    wallet_address, _ = generate_random_solana_keypair()
    
    response = client.post(
        "/auth/nonce",
        json={"wallet_address": wallet_address}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "nonce" in data
    assert "message" in data
    assert data["wallet_address"] == wallet_address

def test_verify_signature():
    """서명 검증 테스트"""
    # 테스트용 키페어 생성
    wallet_address, signing_key = generate_random_solana_keypair()
    
    # Nonce 요청
    response = client.post(
        "/auth/nonce",
        json={"wallet_address": wallet_address}
    )
    
    assert response.status_code == 200
    nonce_data = response.json()
    nonce = nonce_data["nonce"]
    message = nonce_data["message"]
    
    # 메시지 서명
    signature_bytes = signing_key.sign(message.encode('utf-8')).signature
    signature = base58.b58encode(signature_bytes).decode('utf-8')
    
    # 서명 검증
    response = client.post(
        "/auth/verify",
        json={
            "wallet_address": wallet_address,
            "signature": signature
        }
    )
    
    assert response.status_code == 200
    token_data = response.json()
    assert "access_token" in token_data
    assert token_data["wallet_address"] == wallet_address

def test_invalid_signature():
    """잘못된 서명 테스트"""
    # 테스트용 키페어 생성
    wallet_address, _ = generate_random_solana_keypair()
    
    # Nonce 요청
    response = client.post(
        "/auth/nonce",
        json={"wallet_address": wallet_address}
    )
    
    assert response.status_code == 200
    
    # 잘못된 서명으로 검증 요청
    random_bytes = os.urandom(64)
    invalid_signature = base58.b58encode(random_bytes).decode('utf-8')
    
    response = client.post(
        "/auth/verify",
        json={
            "wallet_address": wallet_address,
            "signature": invalid_signature
        }
    )
    
    assert response.status_code == 401
    assert "Invalid signature" in response.json()["detail"]

if __name__ == "__main__":
    # 테스트 실행
    test_get_nonce()
    test_verify_signature()
    test_invalid_signature()
    print("인증 시스템 테스트 완료!")
