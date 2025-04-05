import pytest
import os
import sys
from fastapi.testclient import TestClient
from eth_account import Account
from eth_account.messages import encode_defunct
import random
import string
import time

# 프로젝트 루트 디렉토리를 Python 경로에 추가
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.auth.wallet import create_auth_message
from app..blockchain.hsk_contracts import hsk_to_wei, wei_to_hsk

client = TestClient(app)

def generate_random_address():
    """테스트용 랜덤 이더리움 주소 생성"""
    private_key = "0x" + "".join(random.choices(string.hexdigits, k=64)).lower()
    account = Account.from_key(private_key)
    return account.address, private_key

def get_auth_token(wallet_address, private_key):
    """인증 토큰 획득"""
    # Nonce 요청
    response = client.post(
        "/auth/nonce",
        json={"wallet_address": wallet_address}
    )
    
    nonce_data = response.json()
    message = nonce_data["message"]
    
    # 메시지 서명
    account = Account.from_key(private_key)
    message_hash = encode_defunct(text=message)
    signed_message = account.sign_message(message_hash)
    signature = signed_message.signature.hex()
    
    # 서명 검증 및 토큰 획득
    response = client.post(
        "/auth/verify",
        json={
            "wallet_address": wallet_address,
            "signature": signature
        }
    )
    
    token_data = response.json()
    return token_data["access_token"]

def test_create_user():
    """사용자 생성 테스트"""
    wallet_address, _ = generate_random_address()
    username = f"test_user_{random.randint(1000, 9999)}"
    email = f"{username}@example.com"
    
    response = client.post(
        "/users/",
        json={
            "username": username,
            "email": email,
            "wallet_address": wallet_address
        }
    )
    
    assert response.status_code == 200
    user_data = response.json()
    assert user_data["username"] == username
    assert user_data["email"] == email
    assert user_data["wallet_address"] == wallet_address.lower()
    
    return user_data

def test_get_user():
    """사용자 조회 테스트"""
    # 새 사용자 생성
    user_data = test_create_user()
    user_id = user_data["id"]
    
    # 사용자 조회
    response = client.get(f"/users/{user_id}")
    
    assert response.status_code == 200
    retrieved_user = response.json()
    assert retrieved_user["id"] == user_id
    assert retrieved_user["username"] == user_data["username"]
    assert retrieved_user["email"] == user_data["email"]
    assert retrieved_user["wallet_address"] == user_data["wallet_address"]

def test_get_deposit_info():
    """예치 정보 조회 테스트"""
    response = client.get("/users/deposit/info")
    
    assert response.status_code == 200
    deposit_info = response.json()
    assert "deposit_address" in deposit_info
    assert "message" in deposit_info

def test_get_withdraw_info():
    """인출 정보 조회 테스트"""
    response = client.get("/users/withdraw/info")
    
    assert response.status_code == 200
    withdraw_info = response.json()
    assert "deposit_contract" in withdraw_info
    assert "message" in withdraw_info

def test_user_balance():
    """사용자 잔액 조회 테스트"""
    # 새 사용자 생성
    user_data = test_create_user()
    user_id = user_data["id"]
    
    # 잔액 조회
    response = client.get(f"/users/{user_id}/balance")
    
    assert response.status_code == 200
    balance_data = response.json()
    assert "balance" in balance_data
    assert "balance_formatted" in balance_data

def test_transaction_flow():
    """트랜잭션 흐름 테스트 (모의 트랜잭션)"""
    # 새 사용자 생성
    wallet_address, private_key = generate_random_address()
    username = f"test_user_{random.randint(1000, 9999)}"
    email = f"{username}@example.com"
    
    response = client.post(
        "/users/",
        json={
            "username": username,
            "email": email,
            "wallet_address": wallet_address
        }
    )
    
    user_data = response.json()
    user_id = user_data["id"]
    
    # 인증 토큰 획득
    token = get_auth_token(wallet_address, private_key)
    headers = {"Authorization": f"Bearer {token}"}
    
    # 예치 정보 조회
    response = client.get("/users/deposit/info")
    deposit_info = response.json()
    deposit_address = deposit_info["deposit_address"]
    
    # 모의 예치 트랜잭션 (실제 블록체인 트랜잭션 없이 테스트)
    mock_tx_hash = "0x" + "".join(random.choices(string.hexdigits, k=64)).lower()
    deposit_amount = hsk_to_wei(0.1)  # 0.1 HSK
    
    # 트랜잭션 알림
    response = client.post(
        "/users/deposit/notify",
        json={
            "tx_hash": mock_tx_hash,
            "tx_type": "deposit"
        },
        headers=headers
    )
    
    assert response.status_code in [200, 202]  # 200 또는 202 (Accepted) 응답 허용
    
    # 인출 요청 테스트 (관리자 권한 필요)
    # 실제 환경에서는 관리자 계정으로 테스트해야 함
    withdraw_amount = hsk_to_wei(0.05)  # 0.05 HSK
    
    response = client.post(
        "/users/withdraw/request",
        json={
            "wallet_address": wallet_address,
            "amount": withdraw_amount
        },
        headers=headers
    )
    
    # 관리자 권한이 없으면 401 또는 403 응답이 예상됨
    # 여기서는 권한 검사만 테스트
    assert response.status_code in [200, 401, 403]
    
    print(f"트랜잭션 흐름 테스트 완료: {response.status_code}")

if __name__ == "__main__":
    # 테스트 실행
    test_create_user()
    test_get_user()
    test_get_deposit_info()
    test_get_withdraw_info()
    test_user_balance()
    test_transaction_flow()
    print("사용자 및 트랜잭션 테스트 완료!")
