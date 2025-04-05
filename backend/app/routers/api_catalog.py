from fastapi import APIRouter, Depends, Query, Request
from fastapi.routing import APIRoute
from typing import Dict, List, Optional, Set
from pydantic import BaseModel
import inspect
import re

router = APIRouter()

# API 정보를 담는 모델
class APIInfo(BaseModel):
    path: str
    method: str
    summary: str = ""
    description: str = ""
    category: str
    tags: List[str] = []

# API 목록 응답 모델
class APICatalogResponse(BaseModel):
    total_count: int
    apis: List[APIInfo]

# API 카테고리 정의 - 실용적인 정보 API만 포함
API_CATEGORIES = {
    "crypto": "Cryptocurrency Data",
    "social": "Social Media",
    "derivatives": "Derivatives Market",
    "projects": "Blockchain Projects",
    "opensource": "Open Source",
    # 새로운 실용적 정보 카테고리는 여기에 추가
}

# 태그와 카테고리 매핑 - 실용적인 정보 API만 포함
TAG_TO_CATEGORY = {
    "Cryptocurrency Data": "crypto",
    "Social Media": "social",
    "Derivatives Market": "derivatives",
    "Blockchain Projects": "projects",
    "Open Source": "opensource",
    # 새로운 태그-카테고리 매핑은 여기에 추가
}

# 제외할 경로 패턴
EXCLUDED_PATH_PATTERNS = {
    r"^/$",                # 루트 경로
    r"^/docs",             # 문서 경로
    r"^/redoc",            # ReDoc 경로
    r"^/openapi\.json",    # OpenAPI 스키마
    r"^/health",           # 상태 확인 엔드포인트
    r"^/auth",             # 인증 관련 엔드포인트
    r"^/users",            # 사용자 관련 엔드포인트
    r"^/api-keys",         # API 키 관련 엔드포인트
}

# 제외할 카테고리
EXCLUDED_CATEGORIES = {
    "root", "docs", "health", "openapi.json", "redoc", 
    "auth", "users", "api_keys"
}

# 포함할 카테고리 - 실용적인 정보 API만 포함
INCLUDED_CATEGORIES = {
    "crypto", "social", "derivatives", "projects", "opensource", "api_catalog"
}

# 경로에서 카테고리 추출하는 함수
def extract_category_from_path(path: str) -> str:
    # 경로의 첫 번째 부분을 카테고리로 사용
    # 예: /crypto/btc/usd -> crypto
    match = re.match(r"/([^/]+)", path)
    if match:
        category = match.group(1).lower()
        return category
    return "other"

# API 태그에서 카테고리 추출하는 함수
def extract_category_from_tags(tags: List[str]) -> str:
    # 태그 기반으로 카테고리 결정
    if tags and len(tags) > 0:
        for tag in tags:
            if tag in TAG_TO_CATEGORY:
                return TAG_TO_CATEGORY[tag].lower()
    return "other"

# 경로가 제외 패턴에 해당하는지 확인하는 함수
def is_excluded_path(path: str) -> bool:
    for pattern in EXCLUDED_PATH_PATTERNS:
        if re.match(pattern, path):
            return True
    return False

# 모든 API 경로 수집 함수
def collect_api_routes(app) -> List[APIInfo]:
    api_routes = []
    
    # 모든 라우트 순회
    for route in app.routes:
        if isinstance(route, APIRoute):
            # 경로, 메서드, 요약, 설명 추출
            path = route.path
            
            # 제외 경로 필터링
            if is_excluded_path(path):
                continue
                
            method = route.methods.pop() if route.methods else "GET"
            summary = route.summary or ""
            description = route.description or ""
            
            # 태그 추출
            tags = getattr(route, "tags", [])
            
            # 카테고리 결정
            category = extract_category_from_tags(tags)
            if category == "other":
                category = extract_category_from_path(path)
                
            # 제외 카테고리 필터링
            if category in EXCLUDED_CATEGORIES:
                continue
                
            # 포함 카테고리 필터링 - 실용적인 정보 API만 포함
            if category not in INCLUDED_CATEGORIES:
                continue
            
            # API 정보 생성
            api_info = APIInfo(
                path=path,
                method=method,
                summary=summary,
                description=description,
                category=category,
                tags=tags
            )
            
            api_routes.append(api_info)
    
    return api_routes

# 앱 인스턴스를 저장할 변수
_app_instance = None

# 앱 인스턴스 설정 함수
def set_app_instance(app):
    global _app_instance
    _app_instance = app

# API 목록 조회 엔드포인트
@router.get("/list", response_model=APICatalogResponse, summary="List available APIs")
async def get_api_list(
    request: Request,
    category: Optional[str] = Query(None, description="API category to filter")
):
    """
    Get a list of available APIs.
    
    - **category**: Optionally filter APIs by specific category.
    
    Returns all APIs if no category is specified or if the category is invalid.
    """
    global _app_instance
    
    # 앱 인스턴스가 설정되지 않은 경우 request에서 가져옴
    if _app_instance is None:
        app = request.app
    else:
        app = _app_instance
    
    # 모든 API 경로 수집
    all_apis = collect_api_routes(app)
    
    # 카테고리별 필터링 (대소문자 구분 없이)
    if category:
        category_lower = category.lower()
        # 카테고리 이름 또는 경로 기반으로 필터링
        filtered_apis = [
            api for api in all_apis 
            if api.category.lower() == category_lower or 
               extract_category_from_path(api.path).lower() == category_lower
        ]
    else:
        filtered_apis = all_apis
    
    # API 목록 반환
    return APICatalogResponse(
        total_count=len(filtered_apis),
        apis=filtered_apis
    )

# 카테고리 목록 조회 엔드포인트
@router.get("/categories", summary="List API categories")
async def get_categories(
    request: Request
):
    """
    Get a list of available API categories.
    """
    return API_CATEGORIES
