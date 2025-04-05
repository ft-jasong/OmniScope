from fastapi import Depends, HTTPException, status, Header
from fastapi.security import OAuth2PasswordBearer, HTTPBearer
from sqlalchemy.orm import Session
from jose import jwt, JWTError
from typing import Optional

from app.database import get_db
from app.models import User, APIKey
from app.auth.jwt import verify_token, SECRET_KEY, ALGORITHM

# OAuth2 scheme for JWT token authentication - auto_error=False로 설정하여 Swagger UI에서 자동 인증 요구를 비활성화
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)
security = HTTPBearer(auto_error=False)

async def get_current_user(token: Optional[str] = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """
    Get the current user from the JWT token
    """
    if token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # Verify token
    payload = verify_token(token)
    if payload is None:
        raise credentials_exception
    
    # Extract wallet address from token
    wallet_address: str = payload.get("sub")
    if wallet_address is None:
        raise credentials_exception
    
    # Get user from database
    user = db.query(User).filter(User.wallet_address == wallet_address).first()
    if user is None:
        raise credentials_exception
    
    return user

async def get_current_admin_user(current_user: User = Depends(get_current_user)):
    """
    Check if the current user is an admin
    """
    # 관리자 권한 확인 (wallet_address가 컨트랙트 소유자와 일치하는지 확인)
    # 실제 구현에서는 DB에 admin 필드를 추가하거나 다른 방식으로 관리자 권한을 확인할 수 있습니다.
    if not hasattr(current_user, "is_admin") or not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user

async def get_api_key(api_key: str, db: Session = Depends(get_db)):
    """
    Validate API key and return the associated API key object
    """
    # Find API key in database
    api_key_obj = db.query(APIKey).filter(APIKey.key_id == api_key, APIKey.is_active == True).first()
    
    if not api_key_obj:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
        )
    
    return api_key_obj
