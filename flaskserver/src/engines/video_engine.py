import numpy as np
import mediapipe as mp
from mediapipe.tasks.python.vision import FaceLandmarker, FaceLandmarkerOptions, RunningMode
from mediapipe.tasks.python.core.base_options import BaseOptions
from ultralytics import YOLO
from collections import Counter

try:
    import config
except ImportError:
    class DummyConfig:
        YOLO_MODEL = "models/best.pt"
        FACE_LANDMARKER_MODEL = "models/face_landmarker.task"
        VIDEO_BUFFER_SIZE = 10
    config = DummyConfig()

from ..utils import get_roi_2

class VideoEngine:
    def __init__(self):
        # mediapipe 초기화
        options = FaceLandmarkerOptions(
            base_options=BaseOptions(model_asset_path=str(config.FACE_LANDMARKER_MODEL)),
            running_mode=RunningMode.IMAGE,
            num_faces=5,
            min_face_detection_confidence=0.5,
            output_facial_transformation_matrixes=True
        )
        self.face_landmarker = FaceLandmarker.create_from_options(options)

        # YOLO 초기화
        self.yolo_model = YOLO(str(config.YOLO_MODEL))
        print("✅ [VideoEngine] 모델 로드 완료")

    def analyze(self, batch_frames):
        """10장의 프레임을 받아서 mediapipe + YOLO 분석"""
        try:
            h, w, _ = batch_frames[0].shape
            all_faces = {}

            for i, img in enumerate(batch_frames):
                mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=img)
                results = self.face_landmarker.detect(mp_image)

                if not results.face_landmarks or not results.facial_transformation_matrixes:
                    continue

                for j, face_landmarks in enumerate(results.face_landmarks):
                    matrix = results.facial_transformation_matrixes[j]
                    area = get_roi_2(face_landmarks, matrix, w, h)

                    if area is None:
                        continue

                    if j not in all_faces:
                        all_faces[j] = {'rois': [], 'landmarks_list': [], 'matrices': []}

                    all_faces[j]['rois'].append(area)
                    all_faces[j]['landmarks_list'].append(face_landmarks)
                    all_faces[j]['matrices'].append(matrix)

            for j, face_data in all_faces.items():
                rois = face_data['rois']

                # 80% 이상 프레임에서 감지된 얼굴만 처리
                if len(rois) < config.VIDEO_BUFFER_SIZE * 0.8:
                    continue

                # 볼 교집합 계산
                cheek_x1 = max([r[0] for r in rois])
                cheek_y1 = max([r[1] for r in rois])
                cheek_x2 = min([r[2] for r in rois])
                cheek_y2 = min([r[3] for r in rois])

                if cheek_x1 >= cheek_x2 or cheek_y1 >= cheek_y2:
                    continue

                cheek_area = (cheek_x2 - cheek_x1) * (cheek_y2 - cheek_y1)
                if cheek_area < 100:
                    continue

                all_xs = [[lm.x * w for lm in fl] for fl in face_data['landmarks_list']]
                all_ys = [[lm.y * h for lm in fl] for fl in face_data['landmarks_list']]

                # 모든 프레임 YOLO 판정
                age_votes = []
                for idx, (fl, sxs, sys) in enumerate(zip(face_data['landmarks_list'], all_xs, all_ys)):
                    sfx1 = int(max(0, min(sxs)))
                    sfy1 = int(max(0, min(sys)))
                    sfx2 = int(min(w, max(sxs)))
                    sfy2 = int(min(h, max(sys)))

                    if sfx1 >= sfx2 or sfy1 >= sfy2:
                        continue

                    face_crop = batch_frames[idx][sfy1:sfy2, sfx1:sfx2]
                    yolo_results = self.yolo_model(face_crop, verbose=False, conf=0.01)

                    if len(yolo_results[0].boxes) == 0:
                        continue

                    best_box = max(yolo_results[0].boxes, key=lambda b: float(b.conf[0].item()))
                    age_votes.append(int(best_box.cls[0].item()))

                if not age_votes:
                    continue

                # 70% 이상 동일 판정시에만 통과
                counter = Counter(age_votes)
                most_common_cls, most_common_cnt = counter.most_common(1)[0]

                if most_common_cnt / len(age_votes) < 0.7:
                    continue

                cls = most_common_cls

                # 아기일 때만 반환
                if cls == 0:
                    infant_cnt = counter.get(0, 0)
                    return {
                        "infant_detected": True,
                        "confidence": round(infant_cnt / len(age_votes), 4),
                        "cheek_area": [cheek_x1, cheek_y1, cheek_x2, cheek_y2]
                    }

            # 아기 없음
            return {
                "infant_detected": False,
                "confidence": 0.0,
                "cheek_area": None
            }

        except Exception as e:
            print(f"❌ [VideoEngine] 분석 에러: {e}")
            return {"infant_detected": False, "error": str(e)}