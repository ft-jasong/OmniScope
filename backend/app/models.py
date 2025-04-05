from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declared_attr
from sqlalchemy.orm import validates

from app.database import Base
from app.utils.wallet import normalize_address, checksum_address

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    wallet_address = Column(String, unique=True, index=True)
    balance = Column(Integer, default=0)  # 잔액은 블록체인에서 조회하므로 참조용
    is_admin = Column(Boolean, default=False)  # 관리자 여부
    nonce = Column(String, nullable=True)  # 인증에 사용되는 nonce
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    transactions = relationship("Transaction", back_populates="user")
    api_keys = relationship("APIKey", back_populates="user")
    
    @validates('wallet_address')
    def validate_wallet_address(self, key, address):
        """지갑 주소를 소문자로 정규화합니다."""
        if address:
            return normalize_address(address)
        return address

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    user_wallet = Column(String, index=True)  # 사용자 지갑 주소
    tx_hash = Column(String, unique=True, index=True)
    amount = Column(Integer)  # wei 단위
    tx_type = Column(String)  # deposit, withdraw, withdraw_request, usage_request, usage_deduction
    status = Column(String)  # pending, confirmed, failed
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    recipient = Column(String, nullable=True)  # 수신자 지갑 주소 (사용량 차감 시)

    user = relationship("User", back_populates="transactions")
    
    @validates('user_wallet', 'recipient')
    def validate_wallet_address(self, key, address):
        """지갑 주소를 소문자로 정규화합니다."""
        if address:
            return normalize_address(address)
        return address

class APIKey(Base):
    __tablename__ = "api_keys"

    id = Column(Integer, primary_key=True, index=True)
    key_id = Column(String, unique=True, index=True, nullable=False)  # Public identifier
    secret_key_hash = Column(String, nullable=False)  # Hashed secret key
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=True)  # Optional name for the API key
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)
    
    # Usage tracking
    call_count = Column(Integer, default=0)
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    rate_limit_per_minute = Column(Integer, default=60)  # Default rate limit
    
    # Token consumption
    token_consumption_rate = Column(Float, default=0.01)  # Tokens consumed per API call
    
    # Relationship
    user = relationship("User", back_populates="api_keys")
    usages = relationship("APIUsage", back_populates="api_key")
    
    def __repr__(self):
        return f"<APIKey key_id={self.key_id} user_id={self.user_id}>"

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
