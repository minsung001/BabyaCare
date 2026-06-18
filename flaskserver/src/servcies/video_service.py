import base64
import cv2
import numpy as np
from ..engines.video_engine import VideoEngine
from ..utils import wrap_node_response, log_debug

engine = VideoEngine()

def process_video(data):
    try:
        frames_data = data.get("frames")  # base64 배열 10장
        camera_id = data.get("camera_id", "default_cam")

        if not frames_data:
            return wrap_node_response(success=False, error="no frames data")

        log_debug("VIDEO_SERVICE", f"Processing camera={camera_id}")

        # base64 → numpy 배열로 변환
        frames = []
        for frame_b64 in frames_data:
            try:
                img_bytes = base64.b64decode(frame_b64)
                nparr = np.frombuffer(img_bytes, np.uint8)
                img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                if img is not None:
                    frames.append(img)
            except Exception as e:
                continue

        if not frames:
            return wrap_node_response(success=False, error="frame decode failed")

        # 엔진으로 넘기기
        result = engine.analyze(frames)

        if result is None:
            return wrap_node_response(success=True, data={"camera_id": camera_id, "status": "no_result"})

        return wrap_node_response(success=True, data={"camera_id": camera_id, "result": result})

    except Exception as e:
        log_debug("VIDEO_SERVICE_ERROR", str(e))
        return wrap_node_response(success=False, error=str(e))