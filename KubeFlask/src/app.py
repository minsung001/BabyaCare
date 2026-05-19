from flask import Flask, jsonify
from flask_cors import CORS
from datetime import datetime

# config.py의 설정값들을 가져옵니다.
import config
from config import FLASK_HOST, FLASK_PORT, DEBUG

app = Flask(__name__)
# 노드 서버(3001)와의 원활한 통신을 위한 CORS 허용
CORS(app)

# ==============================
# API ROUTES (Node.js 서버와 연동)
# ==============================

@app.route("/health", methods=["GET"])
def health():
    """서버 상태 확인용"""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "models": {
            "yolo": config.YOLO_OK,
            "audio": config.CRY_OK
        }
    })

@app.route("/models", methods=["GET"])
def models():
    """사용 중인 모델 정보 확인용"""
    return jsonify({
        "audio_model": "baby_cry_onnx",
        "video_model": "yolo + mediapipe",
        "status": "loaded"
    })

def create_app():
    from .routes.video import video_bp
    from .routes.audio import audio_bp
    app.register_blueprint(video_bp, url_prefix='/api/video')
    app.register_blueprint(audio_bp, url_prefix='/api/audio')
    return app

if __name__ == "__main__":
    app.run(
        host=FLASK_HOST,
        port=FLASK_PORT,
        debug=DEBUG,
        use_reloader=False,
        threaded=True
    )