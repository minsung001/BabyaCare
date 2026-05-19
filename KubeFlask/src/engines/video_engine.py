import numpy as np
import mediapipe as mp
from mediapipe.tasks.python.vision import FaceLandmarker, FaceLandmarkerOptions, RunningMode
from mediapipe.tasks.python.core.base_options import BaseOptions
from ultralytics import YOLO
from collections import Counter
import cv2

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
        
        self.baby_yolo_model = YOLO("models/희수님모델.pt")

        print("✅ [VideoEngine] 모델 로드 완료")

        # 추후 매핑값으로 변경해 사용
        camera_points = np.float32([[0,0], [1280,0], [0,720], [1280,720]])
        thermal_points = np.float32([[0,0], [32,0], [0,24], [32,24]])
        self.H, _ = cv2.findHomography(camera_points, thermal_points)

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



    def analyze2(self, batch_frames, thermal_frame):
        """10장의 프레임으로 YOLO bbox 추출"""
        try:
            h, w, _ = batch_frames[0].shape
            
            bbox_list = []
            
            for frame in batch_frames:
                results = self.baby_yolo_model(frame, verbose=False)
                
                if len(results[0].boxes) == 0:
                    continue
                
                best_box = max(results[0].boxes, key=lambda b: float(b.conf[0].item()))
                b = best_box.xyxy[0].tolist()
                bbox_list.append([int(b[0]), int(b[1]), int(b[2]), int(b[3])])
            
            if not bbox_list:
                return {
                    "infant_detected": False,
                    "confidence": 0.0,
                    "bbox": None
                }
            
            # 10장 union (가장 넓게 잡기)
            x1 = min(b[0] for b in bbox_list)
            y1 = min(b[1] for b in bbox_list)
            x2 = max(b[2] for b in bbox_list)
            y2 = max(b[3] for b in bbox_list)
            
            estimated_temp = None
            if thermal_frame is not None:
                pts = np.float32([[x1,y1], [x2,y1], [x1,y2], [x2,y2]]).reshape(-1,1,2)
                dst = cv2.perspectiveTransform(pts, self.H)
                tx1, ty1 = int(dst[0][0][0]), int(dst[0][0][1])
                tx2, ty2 = int(dst[3][0][0]), int(dst[3][0][1])

                # 열화상 배열에서 해당 영역 추출
                region = thermal_frame[ty1:ty2, tx1:tx2]
                temps = region[(region >= 34.0) & (region <= 40.0)]
                if len(temps) > 0:
                    estimated_temp = round(float(np.mean(temps)), 2)

            return {
                "infant_detected": True,
                "confidence": round(len(bbox_list) / len(batch_frames), 4),
                "bbox": [x1, y1, x2, y2],
                "thermal": estimated_temp
            }

        except Exception as e:
            print(f"❌ [VideoEngine] 분석 에러: {e}")
            return {"infant_detected": False, "error": str(e)}