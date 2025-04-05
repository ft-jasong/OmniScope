import pytest
import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

# 프로젝트 루트 디렉토리를 Python 경로에 추가
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import Base, get_db
from app.main import app
from app.models import User, APIKey, Transaction

# 테스트용 데이터베이스 설정
TEST_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def test_db():
    # 테스트용 데이터베이스 생성
    Base.metadata.create_all(bind=engine)
    
    # 테스트 세션 생성
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        # 테스트 후 데이터베이스 초기화
        Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def client(test_db):
    # 테스트용 의존성 오버라이드
    def override_get_db():
        try:
            yield test_db
        finally:
            pass
    
    # 의존성 오버라이드 적용
    app.dependency_overrides[get_db] = override_get_db
    
    # 테스트 클라이언트 생성
    with TestClient(app) as client:
        yield client
    
    # 테스트 후 의존성 오버라이드 제거
    app.dependency_overrides = {}
