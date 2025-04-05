import hashlib
import os
import uuid
from datetime import datetime
from typing import Optional

from app.blockchain.hsk_contracts import deduct_for_usage
from app.database import get_db
from app.models import APIKey, APIUsage, Transaction, User
from dotenv import load_dotenv
from fastapi import Depends, Header, HTTPException, Request, status
from sqlalchemy.orm import Session

# .env 파일 로드
load_dotenv()

def verify_api_key(
    api_key_id: str = Header(..., alias="api-key-id"),
    api_key_secret: str = Header(..., alias="api-key-secret"),
    request: Request = None,
    db: Session = Depends(get_db)
):
    """
    API 키 검증 함수 (ID와 Secret 모두 검증)
    
    Args:
        api_key_id (str): API 키 ID
        api_key_secret (str): API 키 Secret
        request (Request): 요청 객체 (경로 및 메서드 추적용)
        db (Session): 데이터베이스 세션
        
    Returns:
        APIKey: 검증된 API 키 객체
    """
    if not api_key_id or not api_key_secret:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API 키 ID와 Secret이 모두 필요합니다"
        )
    
    # 데이터베이스에서 API 키 조회
    db_api_key = db.query(APIKey).filter(APIKey.key_id == api_key_id).first()
    
    if not db_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="유효하지 않은 API 키입니다"
        )
    
    # Secret 키 검증
    hashed_secret = hashlib.sha256(api_key_secret.encode()).hexdigest()
    if db_api_key.secret_key_hash != hashed_secret:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="유효하지 않은 API 키 Secret입니다"
        )
    
    if not db_api_key.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="비활성화된 API 키입니다"
        )
    
    # API 키 사용량 업데이트
    db_api_key.call_count += 1
    db_api_key.last_used_at = datetime.utcnow()
    
    # 요청 경로 및 메서드 추적 (요청 객체가 제공된 경우)
    if request:
        # API 사용 기록 저장
        endpoint = request.url.path
        method = request.method
        
        # 새 API 사용 기록 생성
        api_usage = APIUsage(
            api_key_id=db_api_key.id,
            endpoint=endpoint,
            method=method,
            timestamp=datetime.utcnow()
        )
        db.add(api_usage)
    
    db.commit()
    
    return db_api_key

def get_api_key_with_tracking(
    api_key_id: str = Header(..., alias="api-key-id"),
    api_key_secret: str = Header(..., alias="api-key-secret"),
    request: Request = None,
    db: Session = Depends(get_db)
):
    """
    API 키 검증 및 사용량 추적 함수
    
    Args:
        api_key_id (str): API 키 ID
        api_key_secret (str): API 키 Secret
        request (Request): 요청 객체
        db (Session): 데이터베이스 세션
        
    Returns:
        APIKey: 검증된 API 키 객체
    """
    # API 키 검증
    api_key = verify_api_key(api_key_id, api_key_secret, request, db)
    
    # 현재 시간 기록
    now = datetime.utcnow()
    
    # API 사용량 추적
    if request:
        # 엔드포인트 및 메서드 정보 추출
        path = request.url.path
        method = request.method
        
        # 콜당 비용 설정 (0.001 HSK = 10^15 wei)
        cost_per_call = 10**14  # 0.001 HSK in wei
        
        # API 사용량 기록
        usage = APIUsage(
            api_key_id=api_key.id,
            endpoint=path,
            method=method,
            timestamp=now,
            cost=cost_per_call,
            is_billed=False
        )
        db.add(usage)
        
        # API 키 사용 횟수 증가 및 마지막 사용 시간 업데이트
        api_key.call_count += 1
        api_key.last_used_at = now
        
        # 사용자 정보 가져오기 - user_id로 조회
        user = db.query(User).filter(User.wallet_address == api_key.user.wallet_address).first()
        
        if user:
            # 미청구된 사용량 계산
            unbilled_usages = db.query(APIUsage).filter(
                APIUsage.api_key_id == api_key.id,
                APIUsage.is_billed == False
            ).all()
            
            # 미청구 사용량이 10개 이상이면 실제 차감 진행
            if len(unbilled_usages) >= 10:
                # 총 차감 비용 계산
                total_cost = sum(usage.cost for usage in unbilled_usages)
                
                try:
                    # 관리자 주소 (수수료 수취 주소) - .env 파일에서 가져오거나 기본값 사용
                    admin_address = os.getenv("FEE_RECIPIENT_ADDRESS", "0xf91aAB71fC16dA79c8ACFAD67aF7C9b39588B246")  # 수수료 수취 지갑 주소
                    
                    # 로그 기록 - 정확한 HSK 값 표시
                    print(f"Deducting {total_cost / 10**18:.6f} HSK from {user.wallet_address}")
                    print(f"Total cost in wei: {total_cost}")
                    print(f"Fee recipient: {admin_address}")
                    
                    # 온체인에서 직접 차감 실행
                    success, result = deduct_for_usage(user.wallet_address, total_cost, admin_address)
                    
                    if success:
                        tx_hash = result
                        status = "pending"
                        print(f"Successfully deducted usage fee. Transaction hash: {tx_hash}")
                    else:
                        # 실패 시 고유한 ID 생성 (중복 방지)
                        tx_hash = f"failed-{uuid.uuid4()}"
                        status = "failed"
                        print(f"Failed to deduct usage fee: {result}")
                    
                    # Transaction 모델에 차감 요청 기록
                    tx = Transaction(
                        user_wallet=user.wallet_address,
                        tx_hash=tx_hash,
                        amount=total_cost,
                        tx_type="usage_deduct",
                        status=status,
                        created_at=now
                    )
                    db.add(tx)
                    
                    # 청구 완료로 표시 (성공 여부와 관계없이)
                    for usage in unbilled_usages:
                        usage.is_billed = True
                    
                    # 변경사항 저장
                    db.commit()
                    
                except Exception as e:
                    print(f"Error deducting usage cost: {str(e)}")
                    # 오류가 발생해도 API 키는 반환
            else:
                # 변경사항 저장
                db.commit()
    
    return api_key
