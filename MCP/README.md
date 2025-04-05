# HashScope MCP - LangChain Tool Integration

HashScope MCP는 AI Agent가 HashScope API를 통해 암호화폐 데이터에 쉽게 접근할 수 있도록 하는 LangChain Tool 통합 라이브러리입니다.

## 배포 링크

- **API 엔드포인트**: [https://hashkey.sungwoonsong.com/api](https://hashkey.sungwoonsong.com/api)
- **API 문서**: [https://hashkey.sungwoonsong.com/docs](https://hashkey.sungwoonsong.com/docs)

## 설치 방법

```bash
pip install -e .
```

## 사용 방법

### 기본 사용법

```python
from langchain.agents import initialize_agent, AgentType
from langchain.llms import OpenAI
from hashscope_mcp import HashScopeToolkit

# HashScope API 키 설정
api_key_id = "hsk_your_api_key_id"
api_key_secret = "sk_your_api_key_secret"

# HashScope 도구 초기화 (로컬 서버 사용)
toolkit = HashScopeToolkit(api_key_id=api_key_id, api_key_secret=api_key_secret, base_url="https://hashkey.sungwoonsong.com")
tools = toolkit.get_tools()

# LangChain Agent 초기화
llm = OpenAI(temperature=0)
agent = initialize_agent(
    tools=tools,
    llm=llm,
    agent=AgentType.STRUCTURED_CHAT_ZERO_SHOT_REACT_DESCRIPTION,
    verbose=True
)

# Agent 실행
agent.run("비트코인의 현재 가격과 김치 프리미엄을 알려줘")
```

### 개별 도구 사용

```python
from hashscope_mcp import (
    get_btc_usd_tool,
    get_btc_krw_tool,
    get_kimchi_premium_tool
)
from hashscope_mcp.hashscope_client import HashScopeClient

# HashScope 클라이언트 초기화
client = HashScopeClient(
    api_key_id="hsk_your_api_key_id",
    api_key_secret="sk_your_api_key_secret",
    base_url="https://hashkey.sungwoonsong.com"
)

# 개별 도구 생성
btc_usd_tool = get_btc_usd_tool(client)
btc_krw_tool = get_btc_krw_tool(client)
kimchi_premium_tool = get_kimchi_premium_tool(client)

# 도구 사용
btc_usd = btc_usd_tool.run()
print(btc_usd)

btc_krw = btc_krw_tool.run()
print(btc_krw)

kimchi_premium = kimchi_premium_tool.run()
print(kimchi_premium)
```

## 사용 가능한 도구

HashScope MCP는 다음과 같은 도구를 제공합니다:

### 암호화폐 데이터
1. **get_btc_usd_price**: BTC/USD 가격 조회 (Binance)
2. **get_btc_krw_price**: BTC/KRW 가격 조회 (Upbit)
3. **get_usdt_krw_price**: USDT/KRW 가격 조회 (Upbit)
4. **get_kimchi_premium**: 김치 프리미엄 조회

### 소셜 미디어 데이터
5. **get_trump_posts**: Donald Trump의 최신 포스트 조회
6. **get_elon_posts**: Elon Musk의 최신 포스트 조회
7. **get_x_trends**: X(Twitter) 트렌드 조회

### 파생상품 시장 데이터
8. **get_funding_rates**: 암호화폐 선물 시장의 펀딩 비율 조회
9. **get_open_interest**: 암호화폐 파생상품의 미결제 약정 비율 조회

### 블록체인 프로젝트 데이터
10. **get_hsk_updates**: HashKey Chain의 최신 업데이트 조회
11. **get_ethereum_standards**: 이더리움 표준 및 제안 정보 조회
12. **get_solana_updates**: Solana 블록체인의 최신 업데이트 조회

### 오픈소스 데이터
13. **get_bitcoin_activity**: Bitcoin Core 저장소 활동 조회
14. **get_ethereum_activity**: Ethereum Core 저장소 활동 조회

## 예제: LangChain과 함께 사용하기

```python
from langchain.agents import initialize_agent, AgentType
from langchain.chat_models import ChatOpenAI
from hashscope_mcp import HashScopeToolkit

# API 키 설정
api_key_id = "hsk_your_api_key_id"
api_key_secret = "sk_your_api_key_secret"

# HashScope 도구 초기화
toolkit = HashScopeToolkit(api_key_id=api_key_id, api_key_secret=api_key_secret, base_url="https://hashkey.sungwoonsong.com")
tools = toolkit.get_tools()

# LangChain Agent 초기화
llm = ChatOpenAI(model="gpt-4", temperature=0)
agent = initialize_agent(
    tools=tools,
    llm=llm,
    agent=AgentType.STRUCTURED_CHAT_ZERO_SHOT_REACT_DESCRIPTION,
    verbose=True
)

# 복잡한 질문에 대한 응답
response = agent.run("""
다음 질문에 답해줘:
1. 비트코인의 현재 가격은 얼마인가? (USD와 KRW 모두)
2. 현재 김치 프리미엄은 얼마인가?
3. 최근 Elon Musk는 어떤 내용을 포스팅했는가?
4. HashKey Chain의 최신 업데이트는 무엇인가?
""")

print(response)
```

## API 키 발급 방법

HashScope API 키를 발급받으려면:

1. [HashScope 웹사이트](https://hashscope.vercel.app/)에 방문하여 계정을 생성합니다.
2. 대시보드에서 "API 키 관리" 섹션으로 이동합니다.
3. "새 API 키 생성" 버튼을 클릭합니다.
4. API 키 ID와 시크릿을 안전하게 저장합니다.

## 주의사항

- API 키 시크릿은 절대로 공개 저장소에 커밋하지 마세요.
- 환경 변수나 안전한 시크릿 관리 도구를 사용하여 API 키를 관리하세요.
- API 사용량에 따라 과금될 수 있으므로 사용량을 모니터링하세요.

## 라이선스

MIT License
