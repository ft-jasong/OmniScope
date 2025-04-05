import os

from app.auth.dependencies import get_current_user
from app.database import Base, engine, get_db, init_db
from app.routers import (api_catalog, api_keys, auth, crypto, derivatives,
                         opensource, projects, social, users)
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.openapi.utils import get_openapi
from fastapi.responses import JSONResponse

# 데이터베이스 초기화
init_db()


app = FastAPI(
    title="OmniScope API",
    description="""OmniScope - 실시간 크립토 시장 데이터 API 플랫폼

OmniScope는 AI 에이전트에 실시간 크립토 시장 데이터를 제공하는 API 플랫폼입니다.

## 주요 기능

* 블록체인 지갑 인증: HSK 체인 기반 지갑으로 로그인
* API 키 관리: HSK 토큰 예치 후 API 키 발급 및 관리
* 데이터 API: 다양한 크립토 데이터 제공 (온체인 데이터, 거래소 데이터, SNS 데이터 등)
* 토큰 예치 및 과금: 사용량에 따른 자동 과금 시스템
* 데이터 제공자 보상: 데이터 소스 등록 및 보상 시스템

## 인증 방식

1. 지갑 인증: `/auth/nonce`와 `/auth/verify` 엔드포인트를 통해 지갑 서명 기반 인증
2. API 키 인증: 데이터 API 호출 시 발급받은 API 키 ID와 Secret 모두 사용 (중요: 두 값 모두 필수)

## 지갑 로그인 플로우

1. Nonce 요청: 사용자의 지갑 주소로 `/auth/nonce` API를 호출하여 서명할 메시지를 받습니다.
2. 메시지 서명: 받은 메시지를 MetaMask 등의 지갑으로 서명합니다.
3. 서명 검증: 서명된 메시지와 지갑 주소를 `/auth/verify` API로 전송하여 검증합니다.
4. JWT 토큰 발급: 서명이 유효하면 JWT 토큰이 발급됩니다.
5. 인증된 요청: 이후 모든 API 요청에 `Authorization: Bearer {token}` 헤더를 포함시킵니다.

### 코드 예시 (프론트엔드)

```javascript
// 1. Nonce 요청
async function requestNonce(walletAddress) {
  const response = await fetch('/auth/nonce', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wallet_address: walletAddress })
  });
  return await response.json();
}

// 2. 메시지 서명 (MetaMask 사용)
async function signMessage(message, walletAddress) {
  try {
    const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
    const signature = await ethereum.request({
      method: 'personal_sign',
      params: [message, walletAddress]
    });
    return signature;
  } catch (error) {
    console.error('Error signing message:', error);
    throw error;
  }
}

// 3. 서명 검증 및 JWT 토큰 발급
async function verifySignature(walletAddress, signature) {
  const response = await fetch('/auth/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      wallet_address: walletAddress,
      signature: signature
    })
  });
  return await response.json();
}

// 4. 전체 로그인 플로우
async function login() {
  // 지갑 연결
  const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
  const walletAddress = accounts[0];
  
  // Nonce 요청
  const { message } = await requestNonce(walletAddress);
  
  // 메시지 서명
  const signature = await signMessage(message, walletAddress);
  
  // 서명 검증 및 토큰 발급
  const { access_token } = await verifySignature(walletAddress, signature);
  
  // 토큰 저장
  localStorage.setItem('token', access_token);
  
  return access_token;
}

// 5. 인증된 API 요청 예시
async function fetchUserProfile() {
  const token = localStorage.getItem('token');
  const response = await fetch('/users/me', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return await response.json();
}
```

## HSK Network Information

- **Network Name**: HSK Network
- **RPC URL**: https://mainnet.hsk.xyz
- **Chain ID**: 177
- **Block Explorer**: https://hashkey.blockscout.com

## Smart Contract Addresses

- **Deposit Contract**: 0x0D313B22601E7AD450DC9b8b78aB0b0014022269

""",
    version="0.1.0",
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/users", tags=["Users"])
app.include_router(api_keys.router, prefix="/api-keys", tags=["API Keys"])
app.include_router(crypto.router, prefix="/crypto", tags=["Cryptocurrency Data"])
app.include_router(social.router, prefix="/social", tags=["Social Media"])
app.include_router(derivatives.router, prefix="/derivatives", tags=["Derivatives Market"])
app.include_router(projects.router, prefix="/projects", tags=["Blockchain Projects"])
app.include_router(opensource.router, prefix="/opensource", tags=["Open Source"])
app.include_router(api_catalog.router, prefix="/api-catalog", tags=["API Catalog"])

# API 카탈로그에 앱 인스턴스 설정
api_catalog.set_app_instance(app)

# 커스텀 OpenAPI 스키마 정의
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    
    openapi_schema = get_openapi(
        title="OmniScope API",
        version="1.0.0",
        description="""OmniScope API는 HSK 네트워크와 SOL 네트워크를 Wormhole 프로토콜로 연결하여 데이터를 제공하는 API입니다.

## 주요 기능

### 1. 예치(Deposit)
- 사용자는 네이티브 HSK를 예치 컨트랙트에 예치할 수 있습니다.
- 예치는 컨트랙트의 `deposit()` 함수를 호출하거나 직접 HSK를 전송하여 수행할 수 있습니다.

### 2. 인출(Withdraw)
- 인출은 관리자만 수행할 수 있습니다.
- 사용자는 인출 요청을 제출하고, 관리자가 이를 처리합니다.

### 3. 사용량 차감(Usage Deduction)
- 관리자는 사용자의 사용량에 따라 HSK를 차감할 수 있습니다.
- 차감된 HSK는 지정된 수신자 주소로 전송됩니다.

## API 키 인증 방식 (중요 업데이트)

모든 API 엔드포인트는 두 개의 헤더를 통한 인증이 필요합니다:

1. `api-key-id`: API 키 ID (예: hsk_1234567890abcdef)
2. `api-key-secret`: API 키 Secret (예: sk_1234567890abcdef1234567890abcdef)

두 값 모두 API 키 발급 시 제공되며, 모든 요청에 반드시 포함되어야 합니다.

### API 키 인증 예시 (cURL)

```bash
curl -X GET "https://api.hashscope.io/crypto/btc-price" \\
     -H "api-key-id: hsk_your_api_key_id" \\
     -H "api-key-secret: sk_your_api_key_secret"
```

### API 키 인증 예시 (JavaScript)

```javascript
const response = await fetch('https://api.hashscope.io/crypto/btc-price', {
  method: 'GET',
  headers: {
    'api-key-id': 'hsk_your_api_key_id',
    'api-key-secret': 'sk_your_api_key_secret'
  }
});
```

## 지갑 인증 방식

지갑 인증은 다음 단계로 이루어집니다:

1. `/auth/nonce` 엔드포인트를 호출하여 서명할 메시지를 받습니다.
2. 받은 메시지를 지갑으로 서명합니다.
3. 서명된 메시지와 지갑 주소를 `/auth/verify` 엔드포인트로 전송하여 검증합니다.
4. 검증이 성공하면 JWT 토큰이 발급됩니다.
5. 발급받은 JWT 토큰을 `Authorization: Bearer {token}` 헤더에 포함하여 요청합니다.

## 컨트랙트 주소
- **HSK 예치 컨트랙트**: 0x0D313B22601E7AD450DC9b8b78aB0b0014022269

## 참고 사항
- HSK 네트워크의 RPC URL: https://mainnet.hsk.xyz
- 모든 금액은 wei 단위로 표시됩니다 (1 HSK = 10^18 wei).
""",
        routes=app.routes,
    )
    
    # API 키 인증 보안 스키마 정의
    if "components" not in openapi_schema:
        openapi_schema["components"] = {}
    
    if "securitySchemes" not in openapi_schema["components"]:
        openapi_schema["components"]["securitySchemes"] = {}
    
    # API 키 인증 스키마 추가
    openapi_schema["components"]["securitySchemes"]["ApiKeyId"] = {
        "type": "apiKey",
        "in": "header",
        "name": "api-key-id",
        "description": "API 키 ID (필수)"
    }
    
    openapi_schema["components"]["securitySchemes"]["ApiKeySecret"] = {
        "type": "apiKey",
        "in": "header",
        "name": "api-key-secret",
        "description": "API 키 Secret (필수)"
    }
    
    # JWT 인증 스키마 추가
    openapi_schema["components"]["securitySchemes"]["BearerAuth"] = {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT",
        "description": "JWT 토큰 인증"
    }
    
    # OAuth2PasswordBearer 스키마 제거
    if "securitySchemes" in openapi_schema["components"]:
        if "OAuth2PasswordBearer" in openapi_schema["components"]["securitySchemes"]:
            del openapi_schema["components"]["securitySchemes"]["OAuth2PasswordBearer"]
    
    # 전역 보안 요구사항 설정
    openapi_schema["security"] = [{"ApiKeyId": [], "ApiKeySecret": []}]
    
    # auth 관련 엔드포인트와 루트 엔드포인트는 보안 요구사항 제외
    for path in openapi_schema["paths"]:
        if path.startswith("/auth") or path == "/" or path == "/health":
            path_item = openapi_schema["paths"][path]
            for method_key in list(path_item.keys()):
                # 유효한 HTTP 메서드인지 확인
                if method_key.lower() in ["get", "post", "put", "delete", "options", "head", "patch", "trace"]:
                    path_item[method_key]["security"] = []
    
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi

@app.get("/", tags=["root"])
async def root():
    return {
        "message": "Welcome to OmniScope API",
        "docs": "/docs",
        "deposit_contract": os.getenv("DEPOSIT_CONTRACT_ADDRESS", "0x0D313B22601E7AD450DC9b8b78aB0b0014022269"),
        "hsk_rpc_url": os.getenv("HSK_RPC_URL", "https://mainnet.hsk.xyz")
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}

# Custom Swagger UI
@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui_html():
    return get_swagger_ui_html(
        openapi_url=app.openapi_url,
        title=f"{app.title} - API 문서",
        oauth2_redirect_url=app.swagger_ui_oauth2_redirect_url,
        swagger_js_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.9.0/swagger-ui-bundle.js",
        swagger_css_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.9.0/swagger-ui.css",
        swagger_favicon_url="/favicon.ico",
    )
