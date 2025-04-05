"""
HashScope MCP Example - Using HashScope with LangChain

This example demonstrates how to use HashScope API with LangChain to create
an AI agent that can access cryptocurrency data.
"""

import os
from langchain.agents import initialize_agent, AgentType
from langchain.chat_models import ChatOpenAI
from hashscope_tools import HashScopeToolkit

def main():
    # API 키 설정 (환경 변수에서 가져오거나 직접 입력)
    api_key_id = os.environ.get("HASHSCOPE_API_KEY_ID", "hsk_your_api_key_id")
    api_key_secret = os.environ.get("HASHSCOPE_API_KEY_SECRET", "sk_your_api_key_secret")
    
    # 개발 환경에서는 로컬 서버 사용
    base_url = os.environ.get("HASHSCOPE_API_URL", "http://localhost:8001")
    
    print(f"Connecting to HashScope API at {base_url}")
    
    # HashScope 도구 초기화
    toolkit = HashScopeToolkit(
        api_key_id=api_key_id, 
        api_key_secret=api_key_secret,
        base_url=base_url
    )
    tools = toolkit.get_tools()
    
    # 사용 가능한 도구 출력
    print(f"Available tools: {len(tools)}")
    for tool in tools:
        print(f"- {tool.name}: {tool.description}")
    
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
        query = "비트코인의 현재 가격과 지난 7일간의 가격 변화, 그리고 소셜 미디어에서의 감성을 분석해줘."
        print(f"Using default query: {query}")
    
    # Agent 실행
    try:
        response = agent.run(query)
        print("\nAgent Response:")
        print(response)
    except Exception as e:
        print(f"Error running agent: {e}")

if __name__ == "__main__":
    main()
