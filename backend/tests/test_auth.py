import pytest
import os
import sys
from fastapi.testclient import TestClient
from eth_account import Account
from eth_account.messages import encode_defunct
import random
import string

# 프로젝트 루트 디렉토리를 Python 경로에 추가
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.auth.wallet import create_auth_message

client = TestClient(app)

def generate_random_address():
    """테스트용 랜덤 이더리움 주소 생성"""
    private_key = "0x" + "".join(random.choices(string.hexdigits, k=64)).lower()
    account = Account.from_key(private_key)
    return account.address, private_key

def test_get_nonce():
    """인증 nonce 요청 테스트"""
    wallet_address, _ = generate_random_address()
    
    response = client.post(
        "/auth/nonce",
        json={"wallet_address": wallet_address}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "nonce" in data
    assert "message" in data
    assert data["wallet_address"] == wallet_address.lower()

def test_verify_signature():
    """서명 검증 테스트"""
    # 테스트용 계정 생성
    wallet_address, private_key = generate_random_address()
    account = Account.from_key(private_key)
    
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
    message_hash = encode_defunct(text=message)
    signed_message = account.sign_message(message_hash)
    signature = signed_message.signature.hex()
    
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
    assert token_data["wallet_address"] == wallet_address.lower()

def test_invalid_signature():
    """잘못된 서명 테스트"""
    # 테스트용 계정 생성
    wallet_address, _ = generate_random_address()
    
    # Nonce 요청
    response = client.post(
        "/auth/nonce",
        json={"wallet_address": wallet_address}
    )
    
    assert response.status_code == 200
    
    # 잘못된 서명으로 검증 요청
    invalid_signature = "0x" + "".join(random.choices(string.hexdigits, k=130)).lower()
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
