from flask import Blueprint, request, jsonify
# 폴더 구조(src/routes/video.py)에 맞춰 상위 폴더의 servcies와 utils 참조
from ..servcies.video_service import process_video
from ..utils import log_debug, wrap_node_response

video_bp = Blueprint("video", __name__)

# app.py에서 url_prefix='/api/video'로 등록했다면, 
# 최종 주소는 http://localhost:5000/api/video/analyze 가 됩니다.
@video_bp.route("/analyze", methods=["POST"])
def video_analyze():
    try:
        # =========================
        # 1. 요청 데이터 안전 처리
        # =========================
        data = request.get_json(silent=True)

        if not data:
            return jsonify(
                wrap_node_response(
                    success=False,
                    error="invalid request body"
                )
            ), 400

        log_debug("VIDEO_BP", "request received")

        # =========================
        # 2. service 호출 (엔진을 사용하는 함수)
        # =========================
        result = process_video(data)

        # =========================
        # 3. 응답 통일
        # =========================
        return jsonify(result)

    except Exception as e:
        log_debug("VIDEO_BP_ERROR", str(e))
        return jsonify(
            wrap_node_response(
                success=False,
                error=str(e)
            )
        ), 500