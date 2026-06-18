from flask import Blueprint, request, jsonify
# [수정] 폴더 구조에 맞춰 경로 변경 (상대 경로 또는 src 경로)
from ..servcies.audio_service import process_audio
from ..utils import log_debug, wrap_node_response
import numpy as np

audio_bp = Blueprint("audio", __name__)

@audio_bp.route("/analyze", methods=["POST"]) # url_prefix가 /api/audio이므로 최종 주소는 /api/audio/analyze
def audio_analyze():
    try:
        # JSON이 아닌 바이너리 형태로 넘기기 때문에 변경
        raw = request.get_data()

        if not raw:
            return jsonify(
                wrap_node_response(
                    success=False,
                    error="invalid request body"
                )
            ), 400

        log_debug("AUDIO_BP", "request received")

        # numpy로 변환해서 service로 넘기기
        audio = np.frombuffer(raw, dtype=np.float32)

        result = process_audio({"audio": audio, "device_id": "rpi"})

        return jsonify(result)

    except Exception as e:
        log_debug("AUDIO_BP_ERROR", str(e))
        return jsonify(
            wrap_node_response(
                success=False,
                error=str(e)
            )
        ), 500