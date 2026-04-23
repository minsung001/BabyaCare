import threading
from collections import deque
import av
import numpy as np
import math
import socket
import time # 상단에 추가
import librosa # 리샘플링용
import torch
from transformers import Wav2Vec2ForSequenceClassification, Wav2Vec2FeatureExtractor
import mediapipe as mp 
import urllib.request
import os
from mediapipe.tasks.python import vision as mp_vision
from mediapipe.tasks.python.vision import FaceLandmarker, FaceLandmarkerOptions, RunningMode
from mediapipe.tasks.python.core.base_options import BaseOptions
import cv2
from ultralytics import YOLO
from collections import Counter
from datetime import datetime

# task api 
MODEL_PATH = "face_landmarker.task"
if not os.path.exists(MODEL_PATH):
    print("face_landmarker.task 모델 파일 다운로드 중...")
    urllib.request.urlretrieve(
        "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task",
        MODEL_PATH
    )
    print("다운로드 완료!")

options = FaceLandmarkerOptions(
    base_options=BaseOptions(model_asset_path=MODEL_PATH),
    running_mode=RunningMode.IMAGE,   # 프레임 단위 처리
    num_faces=5,                      # 최대 감지 얼굴 수 (기존 max_num_faces=1)
    min_face_detection_confidence=0.5, # 감지 신뢰도 임계값 (기존과 동일)
    # refine_landmarks 옵션은 새 API에서 기본 포함됨 (별도 설정 불필요)
    output_facial_transformation_matrixes=True
)
face_landmarker = FaceLandmarker.create_from_options(options)

#_____________________________________________________________________________

device = "cuda" if torch.cuda.is_available() else "cpu"
model_path = "./baby_cry_model_v3" # 사용자님의 학습 모델 경로
model = Wav2Vec2ForSequenceClassification.from_pretrained(model_path).to(device)
feature_extractor = Wav2Vec2FeatureExtractor.from_pretrained(model_path)

# yolo_model = YOLO(r"D:/Graduation_Project/server/yolo_test/runs/detect/baby_face_model4/weights/best.pt")
yolo_model = YOLO(r"yolo_baby_adult\runs\detects\baby_adult_v13\weights\best.pt")

# 음성 분석 돌릴 때 필요한 변수
db_flag = 0
cry_flag = 0
last_db_time = 0
last_cry_time = 0
noise_start_time = None
noise_end_time = None
cry_start_time = None
cry_end_time = None

# 1초 분량의 샘플 수 (48kHz 기준)
TARGET_SR = 144000
CHUNK_SAMPLES = TARGET_SR 

# 비디오 버퍼 사이즈
video_buffer_size = 10

# 데이터를 담아둘 선입선출 버퍼
audio_buffer = deque(maxlen=TARGET_SR)
video_buffer = deque(maxlen=video_buffer_size)

# 서버로 신호를 보낼 소켓 설정
result_sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
SERVER_IP = "127.0.0.1"
RESULT_PORT = 3001

# [설정] 서버가 던져주는 포트
UDP_URL = "udp://127.0.0.1:9999"

last_detection_time = 0

# 포트 충돌 방지용 소켓 설정
result_sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
# [추가] 소켓 재사용 옵션 (포트 충돌 10048 에러 방지 보조)
result_sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)

def fmt(t):
    return datetime.fromtimestamp(t).strftime('%H:%M:%S')


def calculate_db(audio_samples):
    """
    넘파이 배열(audio_samples)을 받아서 실시간 데시벨(dBFS)을 계산합니다.
    기준값(Reference)은 1.0(Max Volume)입니다.
    """
    # 1. RMS(Root Mean Square) 계산: 소리 파동의 평균 크기
    # 제곱(square) -> 평균(mean) -> 루트(sqrt)
    rms = np.sqrt(np.mean(audio_samples**2))
    
    # 2. 아주 작은 소리일 때 log10 에러 방지 (무음 처리)
    if rms < 1e-10:
        return -100.0
    
    # 3. 데시벨 공식: 20 * log10(RMS / Reference)
    # 보통 디지털 오디오는 0dB가 최대치이므로 결과값은 -80 ~ 0 사이로 나옵니다.
    db = 20 * math.log10(rms)
    
    return db

def part1_collector():
    global db_flag, last_detection_time, noise_start_time, last_db_time
    container = None
    """1. 수집, 2. 데시벨 분석, 3. 버퍼에 저장 (상시 가동)"""
    while True:
        try:
            container = av.open(UDP_URL, options={'timeout': '5000000', 'buffer_size': '1024000'})
            ## 이미지, wav 수집
            for frame in container.decode():
                if isinstance(frame, av.AudioFrame):

                    # 1. 스테레오 -> 모노 및 float32 변환
                    data = frame.to_ndarray().astype(np.float32)
                    if data.shape[0] == 2: # 스테레오인 경우
                        data = np.mean(data, axis=0) # 모노로 변환
                    
                    # 2. 버퍼에 추가 (선입선출 대기열)
                    audio_buffer.extend(data)

                    # 3. 데시벨 분석
                    decibel = calculate_db(data)
                    if decibel > -20:
                        if db_flag == 0:
                            noise_start_time = time.time()
                            print(f"노이즈 시작: {fmt(noise_start_time)}")
                            db_flag = 1
                            result_sock.sendto(b"noise start", (SERVER_IP, RESULT_PORT))
                        last_detection_time = time.time() # 데시벨 넘을 때마다 시간 갱신
                        last_db_time = time.time()

                elif isinstance(frame, av.VideoFrame):
                    # PyAV 프레임을 넘파이(RGB)로 변환
                    img = frame.to_ndarray(format='rgb24') ## 3차원 img[719,1279] = [0,0,255] >> 파랑
                    # 버퍼에 추가 (자동으로 오래된 건 삭제됨)
                    video_buffer.append(img)


        except Exception as e:
            print(f"Connection lost, retrying... ({e})")
            if container:
                try:
                    container.close() # 포트 점유 해제
                except:
                    pass
            container = None
            print(" 2초 후 포트 재바인딩 시도...")
            time.sleep(2) # 2초 대기 후 재연결


WINDOW_SIZE = 16000  # 1초
HOP_SIZE = 3200      # 0.2초
THRESHOLD = 0.6      # 60% 판정 기준
 
def part2_audio_analysis():
    global cry_flag, cry_start_time, cry_end_time, db_flag, last_cry_time, last_db_time, noise_start_time, noise_end_time
    time.sleep(2)
    while True:
        if (db_flag or cry_flag) and len(audio_buffer) >= 96000:
            audio_48k = np.array(audio_buffer)
            audio_16k = librosa.resample(audio_48k, orig_sr=48000, target_sr=16000)

            chunks = []
            for i in range(0, len(audio_16k) - WINDOW_SIZE + 1, HOP_SIZE):
                chunks.append(audio_16k[i : i + WINDOW_SIZE])
        
            if not chunks:
                chunks = [audio_16k]

            inputs = feature_extractor(
                chunks,
                sampling_rate=16000,
                return_tensors="pt",
                padding=True
            ).to(device)

            with torch.no_grad():
                logits = model(**inputs).logits
                preds = torch.argmax(logits, dim=-1).cpu().numpy()
        
            cry_ratio = np.mean(preds)
            current_time = time.time()

            # =====================================================
            # [수정] 울음 감지 플래그 처리
            if cry_ratio >= THRESHOLD:
                if cry_flag == 0:
                    cry_start_time = current_time
                    print(f"울음 시작: {fmt(cry_start_time)}")
                    cry_flag = 1
                last_cry_time = current_time
                result_sock.sendto(b"crying start", (SERVER_IP, RESULT_PORT))

            # 울음 10초 이상 없으면 종료
            if cry_flag == 1 and current_time - last_cry_time > 10:
                cry_end_time = current_time
                print(f"울음 종료: {fmt(cry_end_time)}")
                cry_flag = 0
                result_sock.sendto(
                    f"cry:{cry_start_time:.2f},{cry_end_time:.2f}".encode(),
                    (SERVER_IP, RESULT_PORT)
                )

            # 데시벨 10초 이상 없으면 종료
            if db_flag == 1 and current_time - last_db_time > 10:
                noise_end_time = current_time
                print(f"노이즈 종료: {fmt(noise_end_time)}")
                db_flag = 0
                result_sock.sendto(
                    f"noise:{noise_start_time:.2f},{noise_end_time:.2f}".encode(),
                    (SERVER_IP, RESULT_PORT)
                )

            # 둘 다 0이 되면 분석 종료
            if db_flag == 0 and cry_flag == 0:
                print("노이즈 및 울음 모두 종료. 감시 모드 종료.")
            # =====================================================
            time.sleep(1)

        else:
            # AI가 쉴 때는 CPU 점유율을 낮추기 위해 짧게 휴식
            time.sleep(0.1)

def get_yaw_from_matrix(matrix):
    # 4x4 변환행렬에서 yaw(좌우 회전각) 추출
    m = np.array(matrix).reshape(4, 4)
    yaw = np.degrees(np.arctan2(m[0][2], m[2][2]))
    return yaw

def get_roi_2(landmarks, transformation_matrix, w, h):
    yaw = get_yaw_from_matrix(transformation_matrix)
    # yaw가 ±45도 초과면 옆면/뒤통수로 판단
    if abs(yaw) > 45:
        return None
    # 나머지 로직 동일
    if landmarks[234].z < landmarks[454].z:
        indices = [116, 93, 117, 118, 101, 234, 147, 187]
    else:
        indices = [345, 323, 346, 347, 330, 454, 376, 411]
    xs = [landmarks[i].x * w for i in indices]
    ys = [landmarks[i].y * h for i in indices]
    if any(x < 0 or x > w for x in xs) or any(y < 0 or y > h for y in ys):
        return None
    # [x1, y1, x2, y2] 반환
    roi = [int(min(xs)), int(min(ys)), int(max(xs)), int(max(ys))]
    return roi


def part3_video_analysis():
    while True:
        if len(video_buffer) >= video_buffer_size:
            batch_frames = list(video_buffer)
            h, w, _ = batch_frames[0].shape

            #얼굴 데이터를 저장(rois=볼좌표, landmarks_list = 랜드마크, matrices = 행렬)
            all_faces = {}

            for i, img in enumerate(batch_frames):
                mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=img)
                results = face_landmarker.detect(mp_image)

                # 이미지 모델에 돌릴 수 있는 형태로 변환 & 미디어파이프(랜드마크확인 모델을 돌림)
                if not results.face_landmarks or not results.facial_transformation_matrixes:
                    continue # 랜드마크가 안나왔을때
                
                for j, face_landmarks in enumerate(results.face_landmarks):
                    matrix = results.facial_transformation_matrixes[j]
                    area = get_roi_2(face_landmarks, matrix, w, h) # 볼의 범위를 잡아냄
                    
                    if area is None: # 범위가 없는경우(아기가 없거나 잡히지 않은 경우 스킵)
                        continue

                    

                    if j not in all_faces:
                        all_faces[j] = {'rois': [], 'landmarks_list': [], 'matrices': []}

                    all_faces[j]['rois'].append(area)
                    all_faces[j]['landmarks_list'].append(face_landmarks)
                    all_faces[j]['matrices'].append(matrix)
                    # 데이터 추가

            found = False
            for j, face_data in all_faces.items():
                rois = face_data['rois']
                

                if len(rois) < video_buffer_size * 0.8:
                    continue

                # 볼 교집합 계산
                cheek_x1 = max([r[0] for r in rois])
                cheek_y1 = max([r[1] for r in rois])
                cheek_x2 = min([r[2] for r in rois])
                cheek_y2 = min([r[3] for r in rois])

                # 볼 교집합 유의미한지 확인
                if cheek_x1 >= cheek_x2 or cheek_y1 >= cheek_y2:
                    print(f"얼굴{j}: 볼 교집합 없음, 스킵")
                    continue

                cheek_area = (cheek_x2 - cheek_x1) * (cheek_y2 - cheek_y1)
                if cheek_area < 100:
                    print(f"얼굴{j}: 볼 교집합 너무 작음({cheek_area}px), 스킵")
                    continue

                # 얼굴 전체 교집합 크롭 # 모든 x좌표 y좌표를 720p에 맞게 자르고 교집합 구하기
                all_xs = [[lm.x * w for lm in fl] for fl in face_data['landmarks_list']]
                all_ys = [[lm.y * h for lm in fl] for fl in face_data['landmarks_list']]
                fx1 = int(max([max(0, min(xs)) for xs in all_xs]))
                fy1 = int(max([max(0, min(ys)) for ys in all_ys]))
                fx2 = int(min([min(w, max(xs)) for xs in all_xs]))
                fy2 = int(min([min(h, max(ys)) for ys in all_ys]))

                if fx1 >= fx2 or fy1 >= fy2:
                    continue
                # =====================================================
                # [수정] 샘플링 제거, 모든 프레임 YOLO 판정
                age_votes = []
                for idx, (fl, sxs, sys) in enumerate(zip(
                    face_data['landmarks_list'], all_xs, all_ys)):
                    sfx1 = int(max(0, min(sxs)))
                    sfy1 = int(max(0, min(sys)))
                    sfx2 = int(min(w, max(sxs)))
                    sfy2 = int(min(h, max(sys)))

                    if sfx1 >= sfx2 or sfy1 >= sfy2:
                        continue

                    face_crop = batch_frames[idx][sfy1:sfy2, sfx1:sfx2]
                    yolo_results = yolo_model(face_crop, verbose=False, conf=0.01)

                    if len(yolo_results[0].boxes) == 0:
                        continue

                    best_box = max(yolo_results[0].boxes, key=lambda b: float(b.conf[0].item()))
                    age_votes.append(int(best_box.cls[0].item()))
                # =====================================================
                # # 3프레임마다 얼굴 크롭 후 YOLO 판정 (30장 중 10장 샘플링)
                # age_votes = []
                # sample_frames = face_data['landmarks_list'][::3]  # 3프레임마다 샘플링
                # sample_xs = all_xs[::3]
                # sample_ys = all_ys[::3]

                # for idx, (fl, sxs, sys) in enumerate(zip(sample_frames, sample_xs, sample_ys)):
                #     sfx1 = int(max(0, min(sxs)))
                #     sfy1 = int(max(0, min(sys)))
                #     sfx2 = int(min(w, max(sxs)))
                #     sfy2 = int(min(h, max(sys)))

                #     if sfx1 >= sfx2 or sfy1 >= sfy2:
                #         continue

                #     # 해당 프레임 인덱스에서 크롭
                #     frame_idx = idx * 3
                #     face_crop = batch_frames[frame_idx][sfy1:sfy2, sfx1:sfx2]
                #     yolo_results = yolo_model(face_crop, verbose=False, conf=0.01)

                #     if len(yolo_results[0].boxes) == 0:
                #         continue

                #     # conf가 가장 높은 박스의 클래스 투표
                #     best_box = max(yolo_results[0].boxes, key=lambda b: float(b.conf[0].item()))
                #     age_votes.append(int(best_box.cls[0].item()))

                if not age_votes:
                    print(f"얼굴{j}: YOLO 감지 못함, 스킵")
                    continue

                # 가장 많이 나온 클래스가 70% 이상일 때만 통과
                counter = Counter(age_votes)
                most_common_cls, most_common_cnt = counter.most_common(1)[0]
                if most_common_cnt / len(age_votes) < 0.7:
                    print(f"얼굴{j}: 판정 불안정({counter}), 스킵")
                    continue

                cls = most_common_cls
                age_label = yolo_results[0].names[cls]
                print(f"얼굴{j}: {age_label} ({most_common_cnt}/{len(age_votes)}프레임)")

                # 나이대 출력 후 볼 좌표 반환 (아기 아니어도 반환)
                is_infant = "아기 O" if cls == 0 else "아기 X"
                print(f" 확정된 열측정 영역: [{cheek_x1}:{cheek_x2}, {cheek_y1}:{cheek_y2}]")
                print(f" 판정: {is_infant} ({age_label} {most_common_cnt}/{len(age_votes)}프레임)")
                found = True
                break

                # # infant 아니면 다음 얼굴 확인
                # if cls != 0:
                #     continue

                # print(f" 확정된 열측정 영역: [{cheek_x1}:{cheek_x2}, {cheek_y1}:{cheek_y2}]")
                # print(f" 나이대: {age_label} ({most_common_cnt}/{len(age_votes)}프레임)")
                # found = True
                # break

            if not found:
                #print("아기 없음 또는 감지 실패, 2초 후 재시도")
                time.sleep(2)

            time.sleep(1)
        else:
            time.sleep(0.1)



if __name__ == "__main__":
    threading.Thread(target=part1_collector, daemon=True).start()
    threading.Thread(target=part2_audio_analysis, daemon=True).start()
    threading.Thread(target=part3_video_analysis, daemon=True).start()
    
    try:
        while True:
            time.sleep(1) # 프로그램 유지
    except KeyboardInterrupt:
        print("시스템 종료")