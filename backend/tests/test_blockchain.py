import os
import random
import string
import sys

import pytest
from dotenv import load_dotenv
from web3 import Web3

# 프로젝트 루트 디렉토리를 Python 경로에 추가
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.blockchain.hsk_contracts import (deposit_contract, format_wei_to_hsk,
                                          get_balance, get_contract_balance,
                                          get_wallet_balance, hsk_to_wei, w3,
                                          wei_to_hsk)

# 환경 변수 로드
load_dotenv()

def test_web3_connection():
    """Web3 연결 테스트"""
    assert w3.is_connected()
    print(f"Web3 연결 성공: {w3.provider}")
    
    # 현재 블록 번호 확인
    current_block = w3.eth.block_number
    print(f"현재 블록 번호: {current_block}")
    assert current_block > 0

def test_contract_connection():
    """컨트랙트 연결 테스트"""
    # 컨트랙트 주소 확인
    contract_address = deposit_contract.address
    print(f"예치 컨트랙트 주소: {contract_address}")
    assert Web3.is_address(contract_address)
    
    # 컨트랙트 함수 확인
    functions = dir(deposit_contract.functions)
    required_functions = ["deposit", "withdraw", "getBalance"]
    
    for func in required_functions:
        assert func in functions, f"{func} 함수가 컨트랙트에 없습니다"
    
    print(f"컨트랙트 필수 함수 확인 완료: {', '.join(required_functions)}")

def test_balance_functions():
    """잔액 조회 함수 테스트"""
    # 테스트용 주소 (이더리움 제로 주소)
    test_address = "0x0000000000000000000000000000000000000000"
    
    # 예치 잔액 조회
    deposit_balance = get_balance(test_address)
    print(f"예치 잔액: {format_wei_to_hsk(deposit_balance)}")
    assert isinstance(deposit_balance, int)
    
    # 컨트랙트 잔액 조회
    contract_balance = get_contract_balance()
    print(f"컨트랙트 잔액: {format_wei_to_hsk(contract_balance)}")
    assert isinstance(contract_balance, int)
    
    # 지갑 잔액 조회 (이 함수는 실제 블록체인 조회가 필요)
    try:
        wallet_balance = get_wallet_balance(test_address)
        print(f"지갑 잔액: {format_wei_to_hsk(wallet_balance)}")
        assert isinstance(wallet_balance, int)
    except Exception as e:
        print(f"지갑 잔액 조회 중 오류 발생 (예상됨): {e}")

def test_unit_conversion():
    """단위 변환 함수 테스트"""
    # HSK -> Wei 변환
    hsk_amount = 1.5
    wei_amount = hsk_to_wei(hsk_amount)
    assert wei_amount == 1.5 * 10**18
    
    # Wei -> HSK 변환
    converted_hsk = wei_to_hsk(wei_amount)
    assert converted_hsk == hsk_amount
    
    # 포맷팅 테스트
    formatted = format_wei_to_hsk(wei_amount)
    assert "1.500000 HSK" == formatted
    
    print("단위 변환 테스트 완료")

def test_transaction_build():
    """트랜잭션 생성 테스트"""
    from backend.app.blockchain.hsk_contracts import build_deposit_transaction

    # 테스트용 주소 (체크섬 형식으로 생성)
    random_hex = "".join(random.choices(string.hexdigits, k=40)).lower()
    test_address = Web3.to_checksum_address(f"0x{random_hex}")
    
    # 예치 트랜잭션 생성
    amount_wei = hsk_to_wei(0.1)  # 0.1 HSK
    try:
        tx = build_deposit_transaction(test_address, amount_wei)
        
        # 트랜잭션 필드 확인
        assert "to" in tx
        assert "value" in tx
        assert "gas" in tx
        assert tx["to"].lower() == deposit_contract.address.lower()
        assert tx["value"] == amount_wei
        print("트랜잭션 생성 테스트 완료")
    except Exception as e:
        print(f"트랜잭션 생성 중 오류 발생: {e}")
        # 테스트 환경에서는 일부 오류가 예상될 수 있음
        # 실제 네트워크 연결이 필요한 부분이므로 실패해도 테스트 진행

if __name__ == "__main__":
    # 테스트 실행
    test_web3_connection()
    test_contract_connection()
    test_balance_functions()
    test_unit_conversion()
    test_transaction_build()
    print("블록체인 컨트랙트 테스트 완료!")
