from ..engines.audio_engine import AudioEngine
from ..utils import validate_audio, wrap_node_response, log_debug

# 서버 실행 시 엔진 인스턴스 생성
engine = AudioEngine()

def process_audio(data):
    try:
        # =========================
        # 1. 입력 정리
        # =========================
        device_id = data.get("device_id", "unknown_device")
        audio = data.get("audio")

        # utils.py에 정의된 오디오 유효성 검사 호출
        if not validate_audio(audio):
            return wrap_node_response(
                success=False,
                error="invalid audio data"
            )

        log_debug("AUDIO_SERVICE", f"Processing for device: {device_id}")

        # =========================
        # 2. engine 호출
        # =========================
        # 넘파이 배열을 넘겨 모델 돌리기
        result = engine.analyze(audio)

        # =========================
        # 3. 분석 결과 없음 처리 (버퍼링 중 등)
        # >> 노이즈 발생 시 node에서 96000개의 배열을 넘겨 주기 때문에 버퍼링은 없을 것
        # =========================
        if result is None or result.get("msg") == "Buffering...":
            return wrap_node_response(
                success=True,
                data={
                    "device_id": device_id,
                    "status": "buffering",
                    "msg": "데이터를 더 쌓는 중입니다."
                }
            )

        # =========================
        # 4. 아기 울음 감지 로직
        # =========================
        cry_detected = result.get("cry_detected", False)
        cry_ratio = result.get("cry_ratio", 0.0)

        # 울음이 감지되지 않았을 때
        if not cry_detected:
            return wrap_node_response(
                success=True,
                data={
                    "device_id": device_id,
                    "status": "stable",
                    "cry_detected": False,
                    "cry_ratio": cry_ratio
                }
            )

        # =========================
        # 5. 울음 감지 시 정상 응답
        # =========================
        return wrap_node_response(
            success=True,
            data={
                "device_id": device_id,
                "cry_detected": True,
                "cry_ratio": cry_ratio,
                "status": "emergency"
            }
        )

    except Exception as e:
        log_debug("AUDIO_SERVICE_ERROR", str(e))
        return wrap_node_response(
            success=False,
            error=str(e)
        )