from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database import Base

class User(Base):
    __tablename__ = "users"

    wallet_address = Column(String, primary_key=True, index=True)  # 지갑 주소를 PK로 사용
    balance = Column(Integer, default=0)  # 잔액은 블록체인에서 조회하므로 참조용
    is_admin = Column(Boolean, default=False)  # 관리자 여부
    nonce = Column(String, nullable=True)  # 인증에 사용되는 nonce
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    transactions = relationship("Transaction", back_populates="user")
    api_keys = relationship("APIKey", back_populates="user")
    
    def __repr__(self):
        return f"<User wallet_address={self.wallet_address}>"
