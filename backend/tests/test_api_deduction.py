#!/usr/bin/env python3
"""
API 차감 기능 테스트 스크립트

이 스크립트는 제공된 API 키를 사용하여 여러 API를 호출하고,
호출당 0.001 HSK가 차감되는 기능을 테스트합니다.
총 10번의 API 호출을 수행하여 차감 요청이 생성되는지 확인합니다.
"""

import requests
import time
import json
from datetime import datetime
from dotenv import load_dotenv
import os

load_dotenv()

API_KEY_ID = os.getenv("API_KEY_ID")
API_KEY_SECRET = os.getenv("API_KEY_SECRET")

# 서버 URL 설정
BASE_URL = "https://hashkey.sungwoonsong.com"  

# 헤더 설정
headers = {
    "api-key-id": API_KEY_ID,
    "api-key-secret": API_KEY_SECRET,
    "Content-Type": "application/json"
}

# 테스트할 API 엔드포인트 목록
apis = [
    "/crypto/btc/usd",       # BTC 달러 가격
    "/crypto/btc/krw",       # BTC 원화 가격
    "/crypto/usdt/krw",      # USDT 원화 가격
    "/crypto/kimchi-premium", # 김치 프리미엄
    "/crypto/prices"         # 주요 암호화폐 가격 목록
]

def call_api(endpoint):
    """API를 호출하고 응답을 반환합니다."""
    url = f"{BASE_URL}{endpoint}"
    print(f"Calling API: {url}")
    
    try:
        response = requests.get(url, headers=headers)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            return response.json()
        else:
            print(f"Error: {response.text}")
            return None
    except Exception as e:
        print(f"Exception: {str(e)}")
        return None

def main():
    """메인 테스트 함수"""
    print(f"Starting API deduction test at {datetime.now()}")
    print(f"Using API Key ID: {API_KEY_ID}")
    print("=" * 50)
    
    # 총 10번의 API 호출 수행
    total_calls = 10
    call_count = 0
    
    while call_count < total_calls:
        # 5개의 API를 순환하며 호출
        api_index = call_count % len(apis)
        endpoint = apis[api_index]
        
        # API 호출
        result = call_api(endpoint)
        call_count += 1
        
        print(f"Call {call_count}/{total_calls} completed")
        print(f"Endpoint: {endpoint}")
        if result:
            print(f"Response: {json.dumps(result, indent=2, ensure_ascii=False)}")
        else:
            print("Response: Failed to get response")
        print("-" * 30)
        
        # 호출 간격 설정 (서버 부하 방지)
        time.sleep(1)
    
    print("=" * 50)
    print(f"Test completed at {datetime.now()}")
    print(f"Total API calls: {call_count}")
    print("차감 요청이 생성되었는지 데이터베이스에서 확인하세요.")

if __name__ == "__main__":
    main()
