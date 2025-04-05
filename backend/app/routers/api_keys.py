from fastapi import APIRouter, Depends, HTTPException, status, Path
from sqlalchemy.orm import Session
from typing import List, Optional, Dict
from datetime import datetime, timedelta
import secrets
import hashlib
from sqlalchemy import func

from app.database import get_db
from app.models import User, APIKey, APIUsage
from app.auth.dependencies import get_current_user
from pydantic import BaseModel, Field

router = APIRouter()

# 스키마 정의
class APIKeyCreate(BaseModel):
    name: str = Field(None, description="Optional name for the API key")
    rate_limit_per_minute: int = Field(60, description="Rate limit per minute", ge=1, le=1000)

class APIKeyResponse(BaseModel):
    key_id: str
    name: Optional[str] = None
    is_active: bool
    created_at: datetime
    expires_at: Optional[datetime] = None
    rate_limit_per_minute: int
    call_count: int
    last_used_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class APIKeyWithSecret(BaseModel):
    key_id: str
    secret_key: str
    name: Optional[str] = None
    is_active: bool
    created_at: datetime
    expires_at: Optional[datetime] = None
    rate_limit_per_minute: int

class APIKeyUsage(BaseModel):
    key_id: str
    call_count: int
    last_used_at: Optional[datetime] = None
    rate_limit_per_minute: int
    token_consumption_rate: float

class APIEndpointUsage(BaseModel):
    endpoint: str
    method: str
    call_count: int
    last_used_at: Optional[datetime] = None
    total_cost: float

class APIKeyHistoryResponse(BaseModel):
    key_id: str
    total_calls: int
    total_cost: float
    endpoints: List[APIEndpointUsage]

# API 키 생성 및 관리 유틸리티 함수
def generate_api_key_pair():
    """Generate a new API key pair (key_id and secret_key)"""
    key_id = f"hsk_{secrets.token_hex(16)}"
    secret_key = f"sk_{secrets.token_hex(32)}"
    secret_key_hash = hashlib.sha256(secret_key.encode()).hexdigest()
    
    return {
        "key_id": key_id,
        "secret_key": secret_key,
        "secret_key_hash": secret_key_hash
    }

def calculate_expiry_date(days=365):
    """Calculate expiry date for API key"""
    return datetime.utcnow() + timedelta(days=days)

@router.post("/", response_model=APIKeyWithSecret, summary="Create new API key")
async def create_api_key(
    api_key_data: APIKeyCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new API key for the authenticated user.
    
    - **name**: Optional name for the API key
    - **rate_limit_per_minute**: Optional rate limit per minute (default: 60)
    
    Returns the created API key with the secret key. The secret key will only be shown once.
    
    Requires authentication via JWT token.
    """
    # Generate API key pair
    key_pair = generate_api_key_pair()
    
    # Create API key in database
    api_key = APIKey(
        key_id=key_pair["key_id"],
        secret_key_hash=key_pair["secret_key_hash"],
        user_wallet=current_user.wallet_address,
        name=api_key_data.name,
        rate_limit_per_minute=api_key_data.rate_limit_per_minute,
        expires_at=calculate_expiry_date(days=365)
    )
    
    db.add(api_key)
    db.commit()
    db.refresh(api_key)
    
    # Return API key with secret (only shown once)
    return {
        "key_id": api_key.key_id,
        "secret_key": key_pair["secret_key"],  # Only returned once
        "name": api_key.name,
        "is_active": api_key.is_active,
        "created_at": api_key.created_at,
        "expires_at": api_key.expires_at,
        "rate_limit_per_minute": api_key.rate_limit_per_minute
    }

@router.get("/", response_model=List[APIKeyResponse], summary="List all API keys")
async def list_api_keys(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List all API keys for the authenticated user.
    
    Returns a list of API keys without the secret keys.
    
    Requires authentication via JWT token.
    """
    api_keys = db.query(APIKey).filter(APIKey.user_wallet == current_user.wallet_address).all()
    return api_keys

@router.get("/{key_id}", response_model=APIKeyResponse, summary="Get API key details")
async def get_api_key(
    key_id: str = Path(..., description="The ID of the API key"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get details of a specific API key.
    
    - **key_id**: The ID of the API key
    
    Returns the API key details without the secret key.
    
    Requires authentication via JWT token.
    """
    api_key = db.query(APIKey).filter(
        APIKey.key_id == key_id,
        APIKey.user_wallet == current_user.wallet_address
    ).first()
    
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )
    
    return api_key

@router.get("/{key_id}/usage", response_model=APIKeyUsage, summary="Get API key usage")
async def get_api_key_usage(
    key_id: str = Path(..., description="The ID of the API key"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get usage statistics for a specific API key.
    
    - **key_id**: The ID of the API key
    
    Returns the API key usage statistics.
    
    Requires authentication via JWT token.
    """
    api_key = db.query(APIKey).filter(
        APIKey.key_id == key_id,
        APIKey.user_wallet == current_user.wallet_address
    ).first()
    
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )
    
    return {
        "key_id": api_key.key_id,
        "call_count": api_key.call_count,
        "last_used_at": api_key.last_used_at,
        "rate_limit_per_minute": api_key.rate_limit_per_minute,
        "token_consumption_rate": api_key.token_consumption_rate
    }

@router.get("/{key_id}/history", response_model=APIKeyHistoryResponse, summary="Get API key usage history")
async def get_api_key_history(
    key_id: str = Path(..., description="The ID of the API key"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get the usage history for a specific API key.
    
    - **key_id**: The ID of the API key
    
    Returns:
    - Total number of calls
    - Total cost in HSK
    - Usage statistics per endpoint (endpoint, HTTP method, call count, last used time, total cost in HSK)
    
    Requires authentication via JWT token.
    """
    # API 키 존재 여부 확인
    api_key = db.query(APIKey).filter(
        APIKey.key_id == key_id,
        APIKey.user_wallet == current_user.wallet_address
    ).first()
    
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )
    
    # API 키 ID로 API 사용량 기록 조회
    api_usages = db.query(APIUsage).filter(
        APIUsage.api_key_id == api_key.id
    ).all()
    
    # 엔드포인트별 통계 계산
    endpoint_stats = {}
    total_calls = 0
    total_cost = 0.0
    
    # Wei to HSK 변환 상수 (1 HSK = 10^18 wei)
    WEI_TO_HSK = 10**18
    
    for usage in api_usages:
        endpoint_key = f"{usage.method}:{usage.endpoint}"
        total_calls += 1
        
        # Wei를 HSK로 변환
        cost_in_hsk = usage.cost / WEI_TO_HSK if usage.cost else 0
        total_cost += cost_in_hsk
        
        if endpoint_key not in endpoint_stats:
            endpoint_stats[endpoint_key] = {
                "endpoint": usage.endpoint,
                "method": usage.method,
                "call_count": 1,
                "last_used_at": usage.timestamp,
                "total_cost": cost_in_hsk
            }
        else:
            endpoint_stats[endpoint_key]["call_count"] += 1
            endpoint_stats[endpoint_key]["total_cost"] += cost_in_hsk
            if usage.timestamp > endpoint_stats[endpoint_key]["last_used_at"]:
                endpoint_stats[endpoint_key]["last_used_at"] = usage.timestamp
    
    # 엔드포인트별 통계를 리스트로 변환
    endpoints = [APIEndpointUsage(**stats) for stats in endpoint_stats.values()]
    
    # 결과 반환
    return {
        "key_id": api_key.key_id,
        "total_calls": total_calls,
        "total_cost": total_cost,
        "endpoints": endpoints
    }

@router.delete("/{key_id}", summary="Delete API key")
async def delete_api_key(
    key_id: str = Path(..., description="The ID of the API key"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a specific API key.
    
    - **key_id**: The ID of the API key
    
    Returns a success message.
    
    Requires authentication via JWT token.
    """
    api_key = db.query(APIKey).filter(
        APIKey.key_id == key_id,
        APIKey.user_wallet == current_user.wallet_address
    ).first()
    
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )
    
    db.delete(api_key)
    db.commit()
    
    return {"message": "API key deleted successfully"}
