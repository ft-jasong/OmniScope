from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base

class APIKey(Base):
    __tablename__ = "api_keys"

    id = Column(Integer, primary_key=True, index=True)
    key_id = Column(String, unique=True, index=True, nullable=False)  # Public identifier
    secret_key_hash = Column(String, nullable=False)  # Hashed secret key
    user_wallet = Column(String, ForeignKey("users.wallet_address"), nullable=False)
    name = Column(String, nullable=True)  # Optional name for the API key
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)
    
    # Usage tracking
    call_count = Column(Integer, default=0)
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    
    # Rate limiting
    rate_limit_per_minute = Column(Integer, default=60)
    
    # Token consumption
    token_consumption_rate = Column(Float, default=0.01)  # Tokens consumed per API call
    
    # Relationship
    user = relationship("User", back_populates="api_keys")
    usages = relationship("APIUsage", back_populates="api_key")
    
    def __repr__(self):
        return f"<APIKey key_id={self.key_id} user_wallet={self.user_wallet}>"

class APIUsage(Base):
    __tablename__ = "api_usages"
    
    id = Column(Integer, primary_key=True, index=True)
    api_key_id = Column(Integer, ForeignKey("api_keys.id"), nullable=False)
    endpoint = Column(String, nullable=False)  # 호출된 API 엔드포인트
    method = Column(String, nullable=False)  # HTTP 메서드 (GET, POST 등)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    response_time = Column(Float, nullable=True)  # 응답 시간 (초)
    status_code = Column(Integer, nullable=True)  # HTTP 상태 코드
    cost = Column(Float, default=0.0)  # API 호출당 비용
    is_billed = Column(Boolean, default=False)  # 과금 여부
    
    # Relationship
    api_key = relationship("APIKey", back_populates="usages")
    
    def __repr__(self):
        return f"<APIUsage id={self.id} endpoint={self.endpoint} api_key_id={self.api_key_id}>"
