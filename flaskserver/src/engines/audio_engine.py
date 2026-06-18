import numpy as np
import librosa
from transformers import AutoFeatureExtractor
import onnxruntime as ort
from scipy.special import softmax

try:
    from config import (
        BABY_CRY_MODEL, WINDOW_SIZE, HOP_SIZE,
        THRESHOLD, TARGET_SR
    )
except ImportError:
    BABY_CRY_MODEL = "./models/baby_cry_onnx"
    TARGET_SR = 96000
    WINDOW_SIZE = 16000
    HOP_SIZE = 8000
    THRESHOLD = 0.6

class AudioEngine:
    def __init__(self):
        # onnx 모델 로드
        self.session = ort.InferenceSession(str(BABY_CRY_MODEL) + "/Quantization_v3.onnx")
        self.feature_extractor = AutoFeatureExtractor.from_pretrained(str(BABY_CRY_MODEL))
        print("✅ [AudioEngine] ONNX 모델 로드 완료")

    def analyze(self, audio_data):
        """numpy 배열을 받아서 아기 울음 여부를 판별합니다."""
        try:
            # 48kHz → 16kHz 리샘플링
            audio_16k = librosa.resample(audio_data, orig_sr=48000, target_sr=16000)

            # 청크 분할 (1초 윈도우, 0.5초 hop)
            chunks = []
            for i in range(0, len(audio_16k) - WINDOW_SIZE + 1, HOP_SIZE):
                chunks.append(audio_16k[i: i + WINDOW_SIZE])

            if not chunks:
                chunks = [audio_16k]

            # feature 추출
            inputs = self.feature_extractor(
                chunks,
                sampling_rate=16000,
                return_tensors="np",
                padding=True
            )

            # onnx 추론
            logits = self.session.run(
                ["logits"],
                {"input_values": inputs["input_values"]}
            )[0]

            # argmax의 비율이 아닌, softmax의 평균으로 변경(표본이 줄었기 때문)
            probs = softmax(logits, axis=-1)
            cry_ratio = float(np.mean(probs[:, 1]))

            return {
                # 울음 시 true, 노이즈 시 false
                "cry_detected": cry_ratio >= THRESHOLD,
                # 확률인데 굳이 필요한가?
                "cry_ratio": round(cry_ratio, 4)
            }

        except Exception as e:
            print(f"❌ [AudioEngine] 분석 에러: {e}")
            return {"cry_detected": False, "error": str(e)}