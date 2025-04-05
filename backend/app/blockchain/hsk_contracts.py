import json
import os
from typing import Any, Dict, Optional

from dotenv import load_dotenv
from eth_account import Account
from web3 import Web3

load_dotenv()

# HSK 네트워크 연결 설정
HSK_RPC_URL = os.getenv("HSK_RPC_URL", "https://mainnet.hsk.xyz")
w3 = Web3(Web3.HTTPProvider(HSK_RPC_URL))

# 예치 컨트랙트 주소 설정
DEPOSIT_CONTRACT_ADDRESS = os.getenv("DEPOSIT_CONTRACT_ADDRESS")

# 컨트랙트 소유자 개인키 설정
CONTRACT_OWNER_PRIVATE_KEY = os.getenv("CONTRACT_OWNER_PRIVATE_KEY")

# 예치 컨트랙트 ABI 로드
with open("app/blockchain/abi/HSKDeposit.json", "r") as f:
    DEPOSIT_CONTRACT_ABI = json.load(f)

# 예치 컨트랙트 인스턴스 생성
deposit_contract = w3.eth.contract(address=DEPOSIT_CONTRACT_ADDRESS, abi=DEPOSIT_CONTRACT_ABI)

# 단위 변환 유틸리티 함수
def wei_to_hsk(wei_amount: int) -> float:
    """
    Wei 단위를 HSK 단위로 변환합니다. (1 HSK = 10^18 wei)
    """
    return float(wei_amount) / 10**18

def hsk_to_wei(hsk_amount: float) -> int:
    """
    HSK 단위를 Wei 단위로 변환합니다. (1 HSK = 10^18 wei)
    """
    return int(hsk_amount * 10**18)

def format_wei_to_hsk(wei_amount: int) -> str:
    """
    Wei 단위를 HSK 단위로 변환하여 포맷팅합니다.
    """
    hsk_amount = wei_to_hsk(wei_amount)
    return f"{hsk_amount:.6f} HSK"

def get_balance(address):
    """
    사용자의 예치된 HSK 잔액을 조회합니다.
    """
    try:
        # 주소를 체크섬 주소로 변환
        checksum_addr = Web3.to_checksum_address(address)
        print(f"Converting address {address} to checksum format: {checksum_addr}")
        balance = deposit_contract.functions.getBalance(checksum_addr).call()
        return balance
    except Exception as e:
        print(f"Error getting balance: {e}")
        return 0

def get_contract_balance():
    """
    컨트랙트의 총 HSK 잔액을 조회합니다.
    """
    try:
        balance = deposit_contract.functions.getContractBalance().call()
        return balance
    except Exception as e:
        print(f"Error getting contract balance: {e}")
        return 0

def get_wallet_balance(address):
    """
    지갑의 HSK 잔액을 조회합니다.
    """
    try:
        balance = w3.eth.get_balance(address)
        return balance
    except Exception as e:
        print(f"Error getting wallet balance: {e}")
        return 0

def sign_transaction(private_key: str, transaction: Dict[str, Any]) -> str:
    """
    트랜잭션에 서명합니다.
    
    Args:
        private_key: 개인 키
        transaction: 트랜잭션 데이터
        
    Returns:
        서명된 트랜잭션의 해시
    """
    try:
        # 트랜잭션 서명
        signed_tx = w3.eth.account.sign_transaction(transaction, private_key)
        
        # 서명된 트랜잭션 전송
        tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
        
        return tx_hash.hex()
    except Exception as e:
        print(f"Error signing transaction: {e}")
        raise e

def build_deposit_transaction(from_address: str, amount_wei: int, gas_price: Optional[int] = None) -> Dict[str, Any]:
    """
    예치 트랜잭션을 생성합니다.
    
    Args:
        from_address: 송신자 주소
        amount_wei: 예치할 금액 (wei 단위)
        gas_price: 가스 가격 (wei 단위)
        
    Returns:
        트랜잭션 데이터
    """
    try:
        # 가스 가격이 지정되지 않은 경우 네트워크에서 가져옴
        if gas_price is None:
            gas_price = w3.eth.gas_price
        
        # 트랜잭션 데이터 생성
        tx = {
            'from': from_address,
            'to': DEPOSIT_CONTRACT_ADDRESS,
            'value': amount_wei,
            'gas': 100000,  # 예상 가스 한도
            'gasPrice': gas_price,
            'nonce': w3.eth.get_transaction_count(from_address),
            'chainId': w3.eth.chain_id,
        }
        
        return tx
    except Exception as e:
        print(f"Error building deposit transaction: {e}")
        raise e

def verify_deposit_transaction(tx_hash):
    """
    예치 트랜잭션을 검증합니다.
    """
    try:
        # 트랜잭션 정보 가져오기
        tx_receipt = w3.eth.get_transaction_receipt(tx_hash)
        
        # 트랜잭션이 성공했는지 확인
        if tx_receipt and tx_receipt["status"] == 1:
            # 이벤트 로그에서 Deposit 이벤트 찾기
            for log in tx_receipt["logs"]:
                # 체크섬 주소로 변환하여 비교
                contract_addr = Web3.to_checksum_address(DEPOSIT_CONTRACT_ADDRESS)
                log_addr = Web3.to_checksum_address(log["address"])
                if log_addr == contract_addr:
                    # 이벤트 디코딩
                    try:
                        event = deposit_contract.events.Deposit().process_receipt(tx_receipt)
                        if event:
                            for ev in event:
                                return {
                                    "user": ev["args"]["user"],
                                    "amount": ev["args"]["amount"],
                                    "success": True
                                }
                    except Exception as e:
                        print(f"Error decoding event: {e}")
            
            # Deposit 이벤트를 찾지 못했지만 트랜잭션이 성공한 경우
            # 일반 전송일 수 있으므로 트랜잭션 정보 확인
            tx = w3.eth.get_transaction(tx_hash)
            if tx and tx["to"]:
                # 체크섬 주소로 변환하여 비교
                contract_addr = Web3.to_checksum_address(DEPOSIT_CONTRACT_ADDRESS)
                tx_to_addr = Web3.to_checksum_address(tx["to"])
                if tx_to_addr == contract_addr:
                    return {
                        "user": tx["from"],
                        "amount": tx["value"],
                        "success": True
                    }
        
        return {"success": False, "message": "Transaction failed or no Deposit event found"}
    except Exception as e:
        print(f"Error verifying deposit transaction: {e}")
        return {"success": False, "message": str(e)}

def verify_withdraw_transaction(tx_hash):
    """
    인출 트랜잭션을 검증합니다.
    """
    try:
        # 트랜잭션 정보 가져오기
        tx_receipt = w3.eth.get_transaction_receipt(tx_hash)
        
        # 트랜잭션이 성공했는지 확인
        if tx_receipt and tx_receipt["status"] == 1:
            # 이벤트 로그에서 Withdraw 이벤트 찾기
            for log in tx_receipt["logs"]:
                if log["address"].lower() == DEPOSIT_CONTRACT_ADDRESS.lower():
                    # 이벤트 디코딩
                    try:
                        event = deposit_contract.events.Withdraw().process_receipt(tx_receipt)
                        if event:
                            for ev in event:
                                return {
                                    "user": ev["args"]["user"],
                                    "amount": ev["args"]["amount"],
                                    "success": True
                                }
                    except Exception as e:
                        print(f"Error decoding event: {e}")
        
        return {"success": False, "message": "Transaction failed or no Withdraw event found"}
    except Exception as e:
        print(f"Error verifying withdraw transaction: {e}")
        return {"success": False, "message": str(e)}

def verify_usage_deduction_transaction(tx_hash):
    """
    사용량 차감 트랜잭션을 검증합니다.
    """
    try:
        # 트랜잭션 조회
        tx_receipt = w3.eth.get_transaction_receipt(tx_hash)
        if not tx_receipt or not tx_receipt.get('status'):
            return False, "트랜잭션이 실패했거나 존재하지 않습니다."
        
        # 이벤트 로그 확인
        logs = deposit_contract.events.UsageDeducted().process_receipt(tx_receipt)
        if not logs:
            return False, "UsageDeducted 이벤트가 없습니다."
        
        return True, logs[0].args
    except Exception as e:
        return False, str(e)

def deduct_for_usage(user_address, amount_wei, recipient_address):
    """
    사용자의 예치금에서 API 사용 수수료를 차감합니다.
    
    Args:
        user_address (str): 사용자 지갑 주소
        amount_wei (int or float): 차감할 금액 (wei 단위)
        recipient_address (str): 수수료 수취 주소
        
    Returns:
        tuple: (성공 여부, 트랜잭션 해시 또는 오류 메시지)
    """
    try:
        if not CONTRACT_OWNER_PRIVATE_KEY:
            return False, "컨트랙트 소유자 개인키가 설정되지 않았습니다."
        
        # 주소를 체크섬 주소로 변환
        user_address = Web3.to_checksum_address(user_address)
        recipient_address = Web3.to_checksum_address(recipient_address)
        
        # float 타입을 int 타입으로 변환 (Solidity uint256과 호환)
        amount_wei_int = int(amount_wei)
        
        # 사용자의 현재 잔액 확인
        balance = deposit_contract.functions.getBalance(user_address).call()
        if balance < amount_wei_int:
            return False, f"잔액 부족: {wei_to_hsk(balance)} HSK (필요: {wei_to_hsk(amount_wei_int)} HSK)"
        
        # 트랜잭션 생성
        nonce = w3.eth.get_transaction_count(w3.eth.account.from_key(CONTRACT_OWNER_PRIVATE_KEY).address)
        gas_price = w3.eth.gas_price
        
        # deductForUsage 함수 호출 트랜잭션 생성
        tx = deposit_contract.functions.deductForUsage(
            user_address,
            amount_wei_int,  # int 타입으로 변환된 값 사용
            recipient_address
        ).build_transaction({
            'chainId': w3.eth.chain_id,
            'gas': 200000,  # 가스 한도 설정
            'gasPrice': gas_price,
            'nonce': nonce,
        })
        
        # 트랜잭션 서명
        signed_tx = w3.eth.account.sign_transaction(tx, CONTRACT_OWNER_PRIVATE_KEY)
        
        # 트랜잭션 전송
        tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
        
        # 트랜잭션 해시 반환
        return True, w3.to_hex(tx_hash)
    except Exception as e:
        return False, f"차감 실패: {str(e)}"

def get_transaction_status(tx_hash):
    """
    트랜잭션 상태를 조회합니다.
    """
    try:
        # 트랜잭션 정보 가져오기
        tx_receipt = w3.eth.get_transaction_receipt(tx_hash)
        
        if tx_receipt:
            return {
                "status": "confirmed" if tx_receipt["status"] == 1 else "failed",
                "block_number": tx_receipt["blockNumber"],
                "gas_used": tx_receipt["gasUsed"]
            }
        else:
            # 트랜잭션이 아직 처리되지 않은 경우
            return {"status": "pending"}
    except Exception as e:
        print(f"Error getting transaction status: {e}")
        return {"status": "error", "message": str(e)}
