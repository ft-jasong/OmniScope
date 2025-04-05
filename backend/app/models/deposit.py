from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_wallet = Column(String, ForeignKey("users.wallet_address"))
    tx_hash = Column(String, unique=True, index=True)
    amount = Column(Integer)  # wei 단위
    tx_type = Column(String)  # deposit, withdraw, withdraw_request, usage_request, usage_deduction
    status = Column(String)  # pending, confirmed, failed
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="transactions")
