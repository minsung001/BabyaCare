import os
from pathlib import Path

# ====================
# BASE PATH
# ====================
BASE_DIR = Path(__file__).parent

MODELS_DIR = BASE_DIR / "models"
LOG_DIR = BASE_DIR / "logs"

# 안전 생성 (없으면 자동 생성)
MODELS_DIR.mkdir(exist_ok=True)
LOG_DIR.mkdir(exist_ok=True)

# ====================
# MODEL PATHS
# ====================
FACE_LANDMARKER_MODEL = MODELS_DIR / "face_landmarker.task"
BABY_CRY_MODEL = MODELS_DIR / "baby_cry_onnx"
YOLO_MODEL = (MODELS_DIR / "best.pt").resolve()

# ====================
# FILE CHECK
# ====================
def check_file(path: Path):
    return path.exists() and path.stat().st_size > 0


FACE_OK = check_file(FACE_LANDMARKER_MODEL)
YOLO_OK = check_file(YOLO_MODEL)
CRY_OK = check_file(BABY_CRY_MODEL)

# ====================
# FLASK SERVER
# ====================
FLASK_HOST = os.getenv("FLASK_HOST", "0.0.0.0")  # Node.js 연결 필수
FLASK_PORT = int(os.getenv("FLASK_PORT", 5000))
DEBUG = os.getenv("DEBUG", "False").lower() == "true"

# ====================
# NODE.JS INTEGRATION
# ====================
NODE_ALLOWED_ORIGINS = os.getenv("NODE_ALLOWED_ORIGINS", "*")
DEV_NODE_SERVER = os.getenv("DEV_NODE_SERVER", "http://localhost:3000")

# ====================
# API SAFETY LIMITS
# ====================
MAX_FRAME_SIZE_MB = 10
MAX_AUDIO_SIZE_MB = 5
REQUEST_TIMEOUT_SEC = 60

# ====================
# AUDIO SETTINGS
# ====================
TARGET_SR = 96000
WINDOW_SIZE = 16000
HOP_SIZE = 8000
THRESHOLD = 0.6

# ====================
# VIDEO SETTINGS
# ====================
VIDEO_BUFFER_SIZE = 10
CONFIDENCE_THRESHOLD = 0.7

# ====================
# STREAM SETTINGS
# ====================
DEFAULT_STREAM_URL = os.getenv("STREAM_URL", "udp://127.0.0.1:9999")
DEFAULT_ANALYSIS_DURATION = 30

# ====================
# DEVICE
# ====================
DEVICE = os.getenv("DEVICE", "cpu")

# ====================
# LOGGING
# ====================
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
LOG_FILE = LOG_DIR / "analysis.log"