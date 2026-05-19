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
        thermal_data = data.get("thermal")

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

        # 열화상 2차원 변환 
        # 2차원으로 정리해뒀으니 나중에 thermal_frame[y1:y2, x1:x2]로 슬라이싱 해 쓰기
        thermal_frame = None
        if thermal_data and thermal_data.get("frame"):
            thermal_frame = np.array(thermal_data["frame"]).reshape(24, 32)
        
        # 엔진으로 넘기기
        #result = engine.analyze(frames)
        result = engine.analyze2(frames,thermal_frame)

        # 같이 넘겨서 엔진쪽에서 계산
        if result is None:
            return wrap_node_response(success=True, data={"camera_id": camera_id, "status": "no_result"})

        return wrap_node_response(success=True, data={"camera_id": camera_id, "result": result})

    except Exception as e:
        log_debug("VIDEO_SERVICE_ERROR", str(e))
        return wrap_node_response(success=False, error=str(e))