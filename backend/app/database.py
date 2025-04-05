from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
load_dotenv()

# Get project root directory (HashScope folder)
PROJECT_ROOT = Path(__file__).parent.parent  # app -> backend
DATABASE_DIR = PROJECT_ROOT / "database"

# Ensure database directory exists
os.makedirs(DATABASE_DIR, exist_ok=True)

# Database URL from environment variable or default to SQLite in database folder
# 임시로 SQLite를 사용하고 나중에 MySQL로 전환할 예정입니다.
# MySQL 전환 시 사용할 URL 형식: mysql+pymysql://username:password@host:port/database_name
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DATABASE_DIR}/hashscope.db")

# Create SQLAlchemy engine
engine = create_engine(
    DATABASE_URL, 
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()

def get_db():
    """
    Dependency for getting DB session
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """
    Initialize database tables
    """
    # Import models here to ensure they are registered with Base
    from app.models import User, Transaction, APIKey
    
    # Create tables
    Base.metadata.create_all(bind=engine)
