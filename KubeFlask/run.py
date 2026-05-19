#!/usr/bin/env python3
"""
YOLO 분석 Flask 서버 - 안정 실행 버전
"""

import os
import sys
import traceback
from pathlib import Path

# =========================
# 프로젝트 루트
# =========================
PROJECT_ROOT = Path(__file__).parent
sys.path.insert(0, str(PROJECT_ROOT))

# =========================
# 안전 import
# =========================
try:
    from src.app import create_app
except Exception as e:
    print("❌ 앱 import 실패")
    print(traceback.format_exc())
    sys.exit(1)

# =========================
# Flask 앱 생성
# =========================
try:
    app = create_app()
except Exception as e:
    print("❌ Flask 앱 초기화 실패")
    print(traceback.format_exc())
    sys.exit(1)


# =========================
# main 실행
# =========================
if __name__ == '__main__':

    try:
        host = os.getenv('FLASK_HOST', '0.0.0.0')  # ⭐ 변경 (Node.js 연결 필수)
        port = int(os.getenv('FLASK_PORT', 5000))
        debug = os.getenv('DEBUG', 'False').lower() == 'true'

        print("\n🚀 Flask Server Starting")
        print(f"   Host : {host}")
        print(f"   Port : {port}")
        print(f"   Debug: {debug}")

        print("\n📡 Endpoints:")
        print("   GET  /health")
        print("   GET  /models")
        print("   POST /analyze")

        # ⭐ Node.js 연결 안내 추가
        print("\n🔗 Node.js connection ready:")
        print(f"   http://{host}:{port}")

        print("\n⏳ Ready...\n")

        app.run(
            host=host,
            port=port,
            debug=debug,
            use_reloader=False,   # 중요
            threaded=True
        )

    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")

    except Exception:
        print("\n❌ Server crash detected")
        print(traceback.format_exc())