from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import secrets
import string
from datetime import datetime

from app.database import get_db
from app.models import User
from app.auth.wallet import create_auth_message, verify_signature, generate_nonce
from app.auth.jwt import create_access_token
from app.utils.wallet import normalize_address, checksum_address, is_valid_address
from pydantic import BaseModel

router = APIRouter()

# 스키마 정의
class NonceRequest(BaseModel):
    wallet_address: str

class NonceResponse(BaseModel):
    wallet_address: str
    nonce: str
    message: str
    
    def dict(self, *args, **kwargs):
        # 기본 dict 메서드 호출
        data = super().dict(*args, **kwargs)
        # 지갑 주소를 체크섬 형식으로 변환
        if 'wallet_address' in data:
            data['wallet_address'] = checksum_address(data['wallet_address'])
        return data

class VerifySignatureRequest(BaseModel):
    wallet_address: str
    signature: str

class TokenResponse(BaseModel):
    access_token: str
    wallet_address: str
    token_type: str = "bearer"
    
    def dict(self, *args, **kwargs):
        # 기본 dict 메서드 호출
        data = super().dict(*args, **kwargs)
        # 지갑 주소를 체크섬 형식으로 변환
        if 'wallet_address' in data:
            data['wallet_address'] = checksum_address(data['wallet_address'])
        return data

@router.post("/nonce", response_model=NonceResponse, summary="Get authentication nonce")
async def get_nonce(request: NonceRequest, db: Session = Depends(get_db)):
    """
    Get a nonce for wallet authentication.
    
    - **wallet_address**: Ethereum wallet address
    
    Returns a nonce and message to be signed by the wallet.
    """
    # Normalize wallet address
    wallet_address = normalize_address(request.wallet_address)
    
    # Check if user exists
    user = db.query(User).filter(User.wallet_address == wallet_address).first()
    
    # Generate new nonce
    nonce = generate_nonce()
    
    if user:
        # Update existing user's nonce
        user.nonce = nonce
    else:
        # Create new user with wallet address only
        user = User(wallet_address=wallet_address, nonce=nonce)
        db.add(user)
    
    db.commit()
    
    # Create message to be signed
    message = create_auth_message(wallet_address, nonce)
    
    return NonceResponse(
        wallet_address=wallet_address,
        nonce=nonce,
        message=message
    )

@router.post("/verify", response_model=TokenResponse, summary="Verify wallet signature")
async def verify_wallet_signature(request: VerifySignatureRequest, db: Session = Depends(get_db)):
    """
    Verify wallet signature and issue JWT token.
    
    - **wallet_address**: Ethereum wallet address
    - **signature**: Signature of the nonce message
    
    Returns a JWT token if signature is valid.
    """
    # Normalize wallet address
    wallet_address = normalize_address(request.wallet_address)
    
    # Get user from database
    user = db.query(User).filter(User.wallet_address == wallet_address).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid wallet address"
        )
    
    # Create message that should have been signed
    message = create_auth_message(wallet_address, user.nonce)
    
    # Verify signature
    if not verify_signature(message, request.signature, wallet_address):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid signature"
        )
    
    # Generate new nonce for security (prevent replay attacks)
    user.nonce = generate_nonce()
    
    # Update last login time
    user.last_login_at = datetime.utcnow()
    
    db.commit()
    
    # Create access token
    access_token = create_access_token(data={"sub": wallet_address})
    
    return TokenResponse(
        access_token=access_token,
        wallet_address=wallet_address
    )
