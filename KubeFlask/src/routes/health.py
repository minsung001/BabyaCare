from flask import Blueprint, jsonify
from datetime import datetime
# config.py가 프로젝트 루트에 있으므로 그대로 import 합니다.
try:
    import config
except ImportError:
    # 예외 상황을 대비한 더미 객체 (에러 방지용)
    class DummyConfig:
        YOLO_OK = False
        CRY_OK = False
        FACE_OK = False
    config = DummyConfig()

health_bp = Blueprint("health", __name__)

@health_bp.route("/health", methods=["GET"])
def health():
    """
    Node.js 서버나 관리자가 AI 서버의 상태를 확인할 때 사용하는 API입니다.
    """
    try:
        return jsonify({
            "status": "ok",
            "service": "flask-ai-server",
            "timestamp": datetime.now().isoformat(),

            # ==========================================
            # MODEL STATUS (config.py에서 체크한 결과 반영)
            # ==========================================
            "models": {
                "yolo": config.YOLO_OK,   # YOLO 모델(객체 인식) 상태
                "audio": config.CRY_OK,   # 오디오 모델(울음 분석) 상태
                "face": config.FACE_OK     # 페이스 랜드마크 모델 상태
            }
        })

    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500