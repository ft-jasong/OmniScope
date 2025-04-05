"""
OmniScope MCP Example - Using OmniScope with LangChain

This example demonstrates how to use OmniScope API with LangChain to create
an AI agent that can access cryptocurrency data.
"""

import os
import json
from dotenv import load_dotenv
from langchain.agents import initialize_agent, AgentType
from langchain_community.chat_models import ChatOpenAI
from langchain.callbacks import StdOutCallbackHandler

# 환경 변수 로드
load_dotenv()

# 로컬 패키지 임포트
from omniscope_client import OmniScopeClient
from omniscope_tools import OmniScopeToolkit, get_btc_usd_tool

def basic_example():
    """기본 사용 예제"""
    print("\n=== 기본 사용 예제 ===")
    
    # API 키 설정 (환경 변수에서 가져오거나 직접 입력)
    api_key_id = os.environ.get("OMNISCOPE_API_KEY_ID", "hsk_your_api_key_id")
    api_key_secret = os.environ.get("OMNISCOPE_API_KEY_SECRET", "sk_your_api_key_secret")
    
    # 개발 환경에서는 로컬 서버 사용
    base_url = os.environ.get("OMNISCOPE_API_URL", "https://omniscope.sungwoonsong.com")
    
    print(f"Connecting to OmniScope API at {base_url}")
    
    # OmniScope 도구 초기화
    toolkit = OmniScopeToolkit(
        api_key_id=api_key_id, 
        api_key_secret=api_key_secret,
        base_url=base_url
    )
    tools = toolkit.get_tools()
    
    # 사용 가능한 도구 출력
    print(f"Available tools: {len(tools)}")
    for tool in tools[:5]:  # 처음 5개만 출력
        print(f"- {tool.name}: {tool.description}")
    print("... and more")
    
    # OpenAI API 키 확인
    openai_api_key = os.environ.get("OPENAI_API_KEY")
    if not openai_api_key:
        print("Warning: OPENAI_API_KEY not set. LangChain agent example will not work.")
        return
    
    # LangChain Agent 초기화
    llm = ChatOpenAI(model="gpt-3.5-turbo", temperature=0)
    agent = initialize_agent(
        tools=tools,
        llm=llm,
        agent=AgentType.STRUCTURED_CHAT_ZERO_SHOT_REACT_DESCRIPTION,
        verbose=True
    )
    
    # 사용자 입력 받기
    query = input("\nEnter your cryptocurrency question (or press Enter to use default): ")
    if not query:
        query = "비트코인의 현재 가격과 김치 프리미엄을 알려줘."
        print(f"Using default query: {query}")
    
    # Agent 실행
    try:
        response = agent.run(query)
        print("\nAgent Response:")
        print(response)
    except Exception as e:
        print(f"Error running agent: {e}")

def direct_api_example():
    """직접 API 호출 예제"""
    print("\n=== 직접 API 호출 예제 ===")
    
    # API 키 설정
    api_key_id = os.environ.get("OMNISCOPE_API_KEY_ID", "hsk_your_api_key_id")
    api_key_secret = os.environ.get("OMNISCOPE_API_KEY_SECRET", "sk_your_api_key_secret")
    base_url = os.environ.get("OMNISCOPE_API_URL", "https://omniscope.sungwoonsong.com")
    
    # OmniScope 클라이언트 초기화
    client = OmniScopeClient(
        api_key_id=api_key_id,
        api_key_secret=api_key_secret,
        base_url=base_url
    )
    
    # BTC/USD 가격 조회
    try:
        btc_usd = client.get_btc_usd()
        print("BTC/USD Price:", json.dumps(btc_usd, indent=2))
    except Exception as e:
        print(f"Error fetching BTC/USD price: {e}")
    
    # API 카탈로그 조회
    try:
        categories = client.get_categories()
        print("\nAvailable API Categories:", json.dumps(categories, indent=2))
        
        # 첫 번째 카테고리의 API 목록 조회
        if categories.get('categories'):
            first_category = categories['categories'][0]
            print(f"\nAPIs in category '{first_category}':")
            apis = client.get_api_catalog(category=first_category)
            print(json.dumps(apis, indent=2))
    except Exception as e:
        print(f"Error fetching API catalog: {e}")

def dynamic_tools_example():
    """동적 도구 생성 예제"""
    print("\n=== 동적 도구 생성 예제 ===")
    
    # API 키 설정
    api_key_id = os.environ.get("OMNISCOPE_API_KEY_ID", "hsk_your_api_key_id")
    api_key_secret = os.environ.get("OMNISCOPE_API_KEY_SECRET", "sk_your_api_key_secret")
    base_url = os.environ.get("OMNISCOPE_API_URL", "https://omniscope.sungwoonsong.com")
    
    # OmniScope 도구킷 초기화
    toolkit = OmniScopeToolkit(
        api_key_id=api_key_id,
        api_key_secret=api_key_secret,
        base_url=base_url
    )
    
    # 카테고리 목록 조회
    categories = toolkit.get_categories()
    print("Available API Categories:", categories)
    
    # 카테고리별 도구 생성
    if categories:
        category = categories[0]  # 첫 번째 카테고리 선택
        print(f"\nTools for category '{category}':")
        tools = toolkit.get_tools_by_category(category)
        for tool in tools:
            print(f"- {tool.name}: {tool.description}")
        
        # 도구 직접 실행
        if tools:
            print("\nExecuting first tool directly:")
            try:
                result = tools[0].run()
                print(result)
            except Exception as e:
                print(f"Error executing tool: {e}")

def env_toolkit_example():
    """환경 변수를 통한 도구킷 생성 예제"""
    print("\n=== 환경 변수 도구킷 예제 ===")
    
    # 환경 변수 확인
    if not os.environ.get("OMNISCOPE_API_KEY_ID") or not os.environ.get("OMNISCOPE_API_KEY_SECRET"):
        print("OMNISCOPE_API_KEY_ID and OMNISCOPE_API_KEY_SECRET environment variables must be set")
        print("Setting example values for demonstration purposes")
        os.environ["OMNISCOPE_API_KEY_ID"] = "hsk_your_api_key_id"
        os.environ["OMNISCOPE_API_KEY_SECRET"] = "sk_your_api_key_secret"
    
    # 환경 변수에서 도구킷 생성
    try:
        from omniscope_mcp import create_toolkit_from_env
        
        toolkit = create_toolkit_from_env(
            base_url=os.environ.get("OMNISCOPE_API_URL", "https://omniscope.sungwoonsong.com")
        )
        
        print("Successfully created toolkit from environment variables")
        print(f"Available categories: {toolkit.get_categories()}")
        
        # 동적 도구 목록 출력
        dynamic_tools = toolkit.get_dynamic_tools()
        print(f"\nDynamically generated tools: {len(dynamic_tools)}")
        for tool in dynamic_tools[:3]:  # 처음 3개만 출력
            print(f"- {tool.name}: {tool.description}")
        
    except Exception as e:
        print(f"Error creating toolkit from environment variables: {e}")

def main():
    print("OmniScope MCP Examples")
    print("=====================")
    
    while True:
        print("\nSelect an example to run:")
        print("1. Basic usage with LangChain")
        print("2. Direct API calls")
        print("3. Dynamic tools generation")
        print("4. Environment variables toolkit")
        print("0. Exit")
        
        choice = input("\nEnter your choice (0-4): ")
        
        if choice == "1":
            basic_example()
        elif choice == "2":
            direct_api_example()
        elif choice == "3":
            dynamic_tools_example()
        elif choice == "4":
            env_toolkit_example()
        elif choice == "0":
            print("Exiting...")
            break
        else:
            print("Invalid choice. Please try again.")

if __name__ == "__main__":
    main()
