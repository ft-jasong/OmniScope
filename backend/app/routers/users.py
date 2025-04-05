import os
from datetime import datetime
from typing import List, Optional

from app.auth.dependencies import get_current_admin_user, get_current_user
from app.blockchain.hsk_contracts import (build_deposit_transaction,
                                          format_wei_to_hsk, get_balance,
                                          get_contract_balance,
                                          get_transaction_status,
                                          get_wallet_balance, hsk_to_wei,
                                          sign_transaction,
                                          verify_deposit_transaction,
                                          verify_usage_deduction_transaction,
                                          verify_withdraw_transaction,
                                          wei_to_hsk)
from app.database import get_db
from app.models import Transaction, User
from app.utils.wallet import (checksum_address, is_valid_address,
                              normalize_address)
from fastapi import APIRouter, Body, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

router = APIRouter(
    tags=["users"],
    responses={404: {"description": "Not found"}},
)

# 사용자 스키마
class UserResponse(BaseModel):
    wallet_address: str
    balance: int = 0
    is_admin: bool = False
    created_at: datetime
    last_login_at: Optional[datetime] = None

    class Config:
        orm_mode = True
        
    def dict(self, *args, **kwargs):
        # 기본 dict 메서드 호출
        data = super().dict(*args, **kwargs)
        # 지갑 주소를 체크섬 형식으로 변환
        if 'wallet_address' in data:
            data['wallet_address'] = checksum_address(data['wallet_address'])
        return data

# 트랜잭션 스키마
class TransactionCreate(BaseModel):
    user_wallet: str
    tx_hash: str
    amount: int
    tx_type: str = "deposit"
    status: str = "pending"

# 예치 요청 스키마
class DepositRequest(BaseModel):
    wallet_address: str
    amount: int

# 서명 요청 스키마
class SignTransactionRequest(BaseModel):
    wallet_address: str
    amount: int
    private_key: str = Field(..., description="개인 키는 서버에 저장되지 않으며 트랜잭션 서명에만 사용됩니다")

# 서명 응답 스키마
class SignTransactionResponse(BaseModel):
    tx_hash: str
    amount: int
    message: str

# 예치 응답 스키마
class DepositResponse(BaseModel):
    message: str
    deposit_address: str
    amount: int

# 인출 요청 스키마
class WithdrawRequest(BaseModel):
    wallet_address: str
    amount: int

# 인출 응답 스키마
class WithdrawResponse(BaseModel):
    message: str
    request_id: int

# 인출 정보 응답 스키마
class WithdrawInfoResponse(BaseModel):
    message: str
    deposit_contract: str

# 사용량 차감 요청 스키마
class UsageDeductRequest(BaseModel):
    wallet_address: str
    amount: int
    recipient_address: str

# 사용량 차감 응답 스키마
class UsageDeductResponse(BaseModel):
    message: str
    request_id: int

# 트랜잭션 알림 스키마
class TransactionNotify(BaseModel):
    tx_hash: str
    tx_type: str = "deposit"  # deposit, withdraw, usage

# 트랜잭션 상태 응답 스키마
class TransactionStatusResponse(BaseModel):
    status: str
    message: Optional[str] = None

# 사용자 목록 조회
@router.get("/", response_model=List[UserResponse])
def read_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    users = db.query(User).offset(skip).limit(limit).all()
    return users

# 사용자 상세 조회
@router.get("/{wallet_address}", response_model=UserResponse)
def read_user(wallet_address: str, db: Session = Depends(get_db)):
    wallet_address = normalize_address(wallet_address)
    user = db.query(User).filter(User.wallet_address == wallet_address).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# 사용자 잔액 조회
@router.get("/{wallet_address}/balance")
def read_user_balance(wallet_address: str, db: Session = Depends(get_db)):
    wallet_address = normalize_address(wallet_address)
    user = db.query(User).filter(User.wallet_address == wallet_address).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    # 블록체인에서 실제 잔액 조회
    balance = get_balance(wallet_address)
    
    return {
        "wallet_address": checksum_address(wallet_address),
        "balance_wei": balance,
        "balance_hsk": wei_to_hsk(balance),
        "formatted_balance": format_wei_to_hsk(balance)
    }

# 예치 정보 조회
@router.get("/deposit/info", response_model=DepositResponse)
def get_deposit_info():
    deposit_contract = os.getenv("DEPOSIT_CONTRACT_ADDRESS")
    return {
        "message": "아래 주소로 HSK를 전송하여 예치할 수 있습니다.",
        "deposit_address": deposit_contract,
        "amount": 0
    }

# 트랜잭션 서명 및 전송
@router.post("/deposit/sign", response_model=SignTransactionResponse)
async def sign_deposit_transaction(
    request: SignTransactionRequest,
    current_user: User = Depends(get_current_user)
):
    """
    사용자의 개인 키를 사용하여 예치 트랜잭션에 서명하고 전송합니다.
    
    - **wallet_address**: 사용자 지갑 주소
    - **amount**: 예치할 금액 (wei 단위)
    - **private_key**: 개인 키 (서버에 저장되지 않음)
    
    Returns:
        서명된 트랜잭션 해시
    """
    # 지갑 주소 정규화
    wallet_address = normalize_address(request.wallet_address)
    
    # 요청한 사용자와 서명할 지갑 주소가 일치하는지 확인
    if current_user.wallet_address != wallet_address:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only sign transactions for your own wallet"
        )
    
    try:
        # 예치 트랜잭션 생성
        unsigned_tx = build_deposit_transaction(wallet_address, request.amount)
        
        # 트랜잭션 서명
        tx_hash = sign_transaction(unsigned_tx, request.private_key)
        
        return {
            "tx_hash": tx_hash,
            "amount": request.amount,
            "message": f"Transaction signed and sent. Amount: {format_wei_to_hsk(request.amount)} HSK"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to sign transaction: {str(e)}"
        )

# 예치 트랜잭션 알림
@router.post("/deposit/notify", response_model=TransactionStatusResponse)
def notify_deposit_transaction(tx_data: TransactionNotify, db: Session = Depends(get_db)):
    """
    예치 트랜잭션이 완료되었음을 알립니다.
    
    - **tx_hash**: 트랜잭션 해시
    
    Returns:
        트랜잭션 상태
    """
    try:
        # 트랜잭션 검증
        tx_info = verify_deposit_transaction(tx_data.tx_hash)
        
        if not tx_info or not tx_info.get("success", False):
            return {"status": "pending", "message": tx_info.get("message", "Transaction not found or still pending")}
        
        # 지갑 주소 정규화
        wallet_address = normalize_address(tx_info["user"])
        
        # 사용자 조회
        user = db.query(User).filter(User.wallet_address == wallet_address).first()
        
        if not user:
            # 새 사용자 생성
            user = User(
                wallet_address=wallet_address,
                balance=0,
                is_admin=False,
                created_at=datetime.utcnow(),
                last_login_at=None
            )
            db.add(user)
            db.commit()
            db.refresh(user)  # 이 부분이 중요합니다 - ID를 가져오기 위해 refresh 필요
        
        # 트랜잭션 기록
        tx = db.query(Transaction).filter(Transaction.tx_hash == tx_data.tx_hash).first()
        
        if not tx:
            # 새 트랜잭션 생성 - user_id 필드 제외
            tx = Transaction(
                user_wallet=wallet_address,
                tx_hash=tx_data.tx_hash,
                amount=tx_info["amount"],
                tx_type="deposit",
                status="confirmed",
                created_at=datetime.utcnow()
            )
            db.add(tx)
            
            # 사용자 잔액 업데이트 (블록체인에서 최신 잔액 조회)
            try:
                # 블록체인에서 잔액 조회
                blockchain_balance = get_balance(wallet_address)
                print(f"Blockchain balance for {wallet_address}: {blockchain_balance}")
                
                # 현재 DB에 저장된 잔액 확인
                current_db_balance = user.balance or 0
                print(f"Current DB balance for {wallet_address}: {current_db_balance}")
                
                # 트랜잭션 금액
                deposit_amount = tx_info["amount"]
                print(f"Deposit amount: {deposit_amount}")
                
                # 두 가지 방법으로 잔액 업데이트 시도
                # 1. 블록체인 잔액 사용
                if blockchain_balance > 0:
                    user.balance = blockchain_balance
                    print(f"Updated balance from blockchain: {blockchain_balance}")
                # 2. 현재 DB 잔액 + 트랜잭션 금액
                else:
                    new_balance = current_db_balance + deposit_amount
                    user.balance = new_balance
                    print(f"Updated balance by adding deposit amount: {new_balance}")
                
                db.commit()
                print(f"Final user balance after commit: {user.balance}")
            except Exception as e:
                print(f"Error updating balance: {str(e)}")
                # 오류가 발생해도 트랜잭션은 기록
                db.commit()
            
            return {
                "status": "confirmed", 
                "message": f"Deposit confirmed: {format_wei_to_hsk(tx_info['amount'])} HSK"
            }
        else:
            # 이미 처리된 트랜잭션
            return {"status": tx.status, "message": "Transaction already processed"}
            
    except Exception as e:
        import traceback
        print(f"Error in notify_deposit_transaction: {str(e)}")
        print(traceback.format_exc())
        return {"status": "error", "message": f"Error processing transaction: {str(e)}"}

# 인출 정보 조회
@router.get("/withdraw/info", response_model=WithdrawInfoResponse)
def get_withdraw_info():
    deposit_contract = os.getenv("DEPOSIT_CONTRACT_ADDRESS")
    return {
        "message": "인출은 관리자만 수행할 수 있습니다. 인출 요청을 제출하면 관리자가 처리합니다.",
        "deposit_contract": deposit_contract
    }

# 인출 요청
@router.post("/withdraw/request", response_model=WithdrawResponse)
def request_withdraw(
    request: WithdrawRequest, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    인출 요청을 생성합니다.
    
    - **wallet_address**: 인출할 지갑 주소
    - **amount**: 인출할 금액 (wei 단위)
    
    Returns:
        인출 요청 ID
    """
    # 지갑 주소 정규화
    wallet_address = normalize_address(request.wallet_address)
    
    # 요청한 사용자와 인출할 지갑 주소가 일치하는지 확인
    if current_user.wallet_address != wallet_address:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only withdraw to your own wallet"
        )
    
    # 잔액 확인
    balance = get_balance(wallet_address)
    
    if balance < request.amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient balance. Available: {format_wei_to_hsk(balance)} HSK"
        )
    
    # 트랜잭션 생성
    tx = Transaction(
        user_wallet=wallet_address,
        tx_hash="pending",
        amount=request.amount,
        tx_type="withdraw",
        status="pending",
        created_at=datetime.utcnow()
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    
    return {
        "message": f"Withdraw request created for {format_wei_to_hsk(request.amount)} HSK",
        "request_id": tx.id
    }

# 인출 트랜잭션 알림
@router.post("/withdraw/notify", response_model=TransactionStatusResponse)
def notify_withdraw_transaction(
    tx_data: TransactionNotify, 
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    인출 트랜잭션이 완료되었음을 알립니다. (관리자 전용)
    
    - **tx_hash**: 트랜잭션 해시
    
    Returns:
        트랜잭션 상태
    """
    try:
        # 트랜잭션 검증
        tx_info = verify_withdraw_transaction(tx_data.tx_hash)
        
        if not tx_info:
            return {"status": "pending", "message": "Transaction not found or still pending"}
        
        # 지갑 주소 정규화
        wallet_address = normalize_address(tx_info["to"])
        
        # 사용자 조회
        user = db.query(User).filter(User.wallet_address == wallet_address).first()
        
        if not user:
            return {"status": "error", "message": "User not found"}
        
        # 트랜잭션 기록
        tx = db.query(Transaction).filter(Transaction.tx_hash == tx_data.tx_hash).first()
        
        if not tx:
            # 새 트랜잭션 생성
            tx = Transaction(
                user_wallet=wallet_address,
                tx_hash=tx_data.tx_hash,
                amount=tx_info["value"],
                tx_type="withdraw",
                status="confirmed",
                created_at=datetime.utcnow()
            )
            db.add(tx)
            db.commit()
            
            return {
                "status": "confirmed", 
                "message": f"Withdraw confirmed: {format_wei_to_hsk(tx_info['value'])} HSK"
            }
        else:
            # 이미 처리된 트랜잭션
            return {"status": tx.status, "message": "Transaction already processed"}
            
    except Exception as e:
        return {"status": "error", "message": f"Error processing transaction: {str(e)}"}

# 사용량 차감 요청
@router.post("/usage/deduct", response_model=UsageDeductResponse)
def deduct_for_usage(
    request: UsageDeductRequest, 
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    사용량에 따른 차감 요청을 생성합니다. (관리자 전용)
    
    - **wallet_address**: 차감할 지갑 주소
    - **amount**: 차감할 금액 (wei 단위)
    - **recipient_address**: 수신자 지갑 주소
    
    Returns:
        차감 요청 ID
    """
    # 지갑 주소 정규화
    wallet_address = normalize_address(request.wallet_address)
    recipient_address = normalize_address(request.recipient_address)
    
    # 사용자 조회
    user = db.query(User).filter(User.wallet_address == wallet_address).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # 잔액 확인
    balance = get_balance(wallet_address)
    
    if balance < request.amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient balance. Available: {format_wei_to_hsk(balance)} HSK"
        )
    
    # 트랜잭션 생성
    tx = Transaction(
        user_wallet=wallet_address,
        tx_hash="pending",
        amount=request.amount,
        tx_type="usage_deduct",
        status="pending",
        created_at=datetime.utcnow(),
        recipient=recipient_address
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    
    return {
        "message": f"Usage deduction request created for {format_wei_to_hsk(request.amount)} HSK",
        "request_id": tx.id
    }

# 사용량 차감 트랜잭션 알림
@router.post("/usage/notify", response_model=TransactionStatusResponse)
def notify_usage_deduction_transaction(
    tx_data: TransactionNotify, 
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    사용량 차감 트랜잭션이 완료되었음을 알립니다. (관리자 전용)
    
    - **tx_hash**: 트랜잭션 해시
    
    Returns:
        트랜잭션 상태
    """
    try:
        # 트랜잭션 검증
        tx_info = verify_usage_deduction_transaction(tx_data.tx_hash)
        
        if not tx_info:
            return {"status": "pending", "message": "Transaction not found or still pending"}
        
        # 지갑 주소 정규화
        from_address = normalize_address(tx_info["from"])
        to_address = normalize_address(tx_info["to"])
        
        # 사용자 조회
        user = db.query(User).filter(User.wallet_address == from_address).first()
        
        if not user:
            return {"status": "error", "message": "User not found"}
        
        # 트랜잭션 기록
        tx = db.query(Transaction).filter(Transaction.tx_hash == tx_data.tx_hash).first()
        
        if not tx:
            # 새 트랜잭션 생성
            tx = Transaction(
                user_wallet=from_address,
                tx_hash=tx_data.tx_hash,
                amount=tx_info["value"],
                tx_type="usage_deduct",
                status="confirmed",
                created_at=datetime.utcnow(),
                recipient=to_address
            )
            db.add(tx)
            db.commit()
            
            return {
                "status": "confirmed", 
                "message": f"Usage deduction confirmed: {format_wei_to_hsk(tx_info['value'])} HSK"
            }
        else:
            # 이미 처리된 트랜잭션
            return {"status": tx.status, "message": "Transaction already processed"}
            
    except Exception as e:
        return {"status": "error", "message": f"Error processing transaction: {str(e)}"}
