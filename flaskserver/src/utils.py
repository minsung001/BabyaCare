import numpy as np
import math
from datetime import datetime


# ======================================================
# TIME FORMAT
# ======================================================
def fmt(t):
    """timestamp → HH:MM:SS"""
    try:
        return datetime.fromtimestamp(t).strftime('%H:%M:%S')
    except:
        return "00:00:00"


# ======================================================
# HEAD POSE (YAW)
# ======================================================
def get_yaw_from_matrix(matrix):

    try:
        if matrix is None:
            return 0.0

        m = np.array(matrix, dtype=np.float32)

        if m.size != 16:
            return 0.0

        m = m.reshape(4, 4)

        yaw = np.degrees(np.arctan2(m[0][2], m[2][2]))

        if not np.isfinite(yaw):
            return 0.0

        return float(yaw)

    except:
        return 0.0


# ======================================================
# ROI (CHEEK AREA)
# ======================================================
def get_roi_2(landmarks, transformation_matrix, w, h):

    try:
        yaw = get_yaw_from_matrix(transformation_matrix)

        # face angle filter
        if abs(yaw) > 45:
            return None

        if landmarks is None or len(landmarks) < 468:
            return None

        try:
            if landmarks[234].z < landmarks[454].z:
                indices = [116, 93, 117, 118, 101, 234, 147, 187]
            else:
                indices = [345, 323, 346, 347, 330, 454, 376, 411]
        except:
            return None

        xs = []
        ys = []

        for i in indices:
            if i >= len(landmarks):
                continue
            xs.append(landmarks[i].x * w)
            ys.append(landmarks[i].y * h)

        if len(xs) == 0 or len(ys) == 0:
            return None

        # bounds check
        if any(x < 0 or x > w for x in xs):
            return None
        if any(y < 0 or y > h for y in ys):
            return None

        roi = [
            int(min(xs)),
            int(min(ys)),
            int(max(xs)),
            int(max(ys))
        ]

        return roi

    except:
        return None


# ======================================================
# RESULT NORMALIZATION (API RESPONSE)
# ======================================================
def normalize_result(result_dict):

    try:
        if not isinstance(result_dict, dict):
            return {}

        return {
            'infant_detected': bool(result_dict.get('infant_detected', False)),
            'age_label': result_dict.get('age_label', None),
            'confidence': round(float(result_dict.get('confidence', 0.0)), 4),
            'cheek_area': result_dict.get('cheek_area', None),
            'cry_detected': len(result_dict.get('cry_events', [])) > 0,
            'cry_events': result_dict.get('cry_events', []),
            'status': result_dict.get('status', 'completed'),
            'duration': round(float(result_dict.get('duration', 0.0)), 2)
        }

    except:
        return {
            'infant_detected': False,
            'age_label': None,
            'confidence': 0.0,
            'cheek_area': None,
            'cry_detected': False,
            'cry_events': [],
            'status': 'error',
            'duration': 0.0
        }


# ======================================================
# NODE.JS / API SAFETY LAYER (추가)
# ======================================================
def safe_api_response(data):
    """
    Node.js로 보내기 전에 안전 보장
    """

    try:
        if data is None:
            return {}

        if not isinstance(data, dict):
            return {}

        return data

    except:
        return {}


# ======================================================
# INPUT VALIDATION (FRAME)
# ======================================================
def validate_frame(frame):

    try:
        if frame is None:
            return False

        # numpy / list / bytes 허용
        if hasattr(frame, "shape"):
            return True

        if isinstance(frame, (list, bytes)):
            return True

        return False

    except:
        return False


# ======================================================
# INPUT VALIDATION (AUDIO)
# ======================================================
def validate_audio(audio):

    try:
        if audio is None:
            return False

        if len(audio) == 0:
            return False

        return True

    except:
        return False


# ======================================================
# DEBUG LOGGER
# ======================================================
def log_debug(tag, msg):

    try:
        print(f"[{tag}] {msg}")
    except:
        pass


# ======================================================
# NODE.JS RESPONSE WRAPPER
# ======================================================
def wrap_node_response(success=True, data=None, error=None):

    return {
        "success": success,
        "data": safe_api_response(data),
        "error": error
    }