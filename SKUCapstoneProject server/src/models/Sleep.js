const mongoose = require('mongoose');

const sleepSchema = new mongoose.Schema({
    // 1. 센서 측정 데이터
    temp: { type: Number, required: true },
    humidity: { type: Number, required: true },
    noise: { type: Number, required: true },
    light: Number, // 조도 센서 (있을 경우)

    // 2. AI 분석 데이터 (팀원 파이썬 코드 결과물)
    isCrying: { type: Number, default: 0 }, // 0: 안울음, 1: 울음 (MLR 학습 핵심 변수)
    
    // 3. 움직임 및 ROI 데이터 (추후 고도화용)
    noseX: Number,      // 기존 움직임 감지용
    faceDetected: { type: Boolean, default: false }, // 얼굴이 카메라에 포착되었는지 여부
    roiData: {          // 팀원이 구상한 확정 열측정 영역 좌표 저장
        x1: Number,
        y1: Number,
        x2: Number,
        y2: Number
    },

    // 4. 모델 학습 및 리포트용
    actualScore: Number, // 모델 학습용 정답지 (Seed Data 생성 시 사용)
    time: String,        // 시각 (예: "14:00")
    
    // 5. 메타데이터
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Sleep', sleepSchema);