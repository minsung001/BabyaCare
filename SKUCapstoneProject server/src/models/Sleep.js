const mongoose = require('mongoose');

const sleepSchema = new mongoose.Schema({
    // 1. 센서 측정 데이터 (Node.js에서 센서값을 가져와 결합)
    temp: { type: Number, required: true },
    humidity: { type: Number, required: true },
    noise: { type: Number, required: true },
    light: { type: Number, default: 0 }, // 조도 센서 기본값 설정

    // 2. AI 분석 데이터 (Flask 서버 분석 결과물)
    isCrying: { type: Number, default: 0 }, // 0: 평온, 1: 울음
    
    // 3. 움직임 및 영상 분석 데이터 (고도화용)
    noseX: Number,       
    faceDetected: { type: Boolean, default: false }, 
    roiData: {           
        x1: Number,
        y1: Number,
        x2: Number,
        y2: Number
    },

    // 4. 모델 학습 및 리포트 핵심 데이터
    actualScore: { type: Number, index: true }, // ⚠️ 검색 최적화를 위해 인덱스 추가
    
    // 5. 메타데이터 (시간 관리 핵심)
    // 8시 리포트와 1시간 집계를 위해 createdAt에 인덱스를 걸어주는 것이 성능상 아주 유리합니다.
    createdAt: { 
        type: Date, 
        default: Date.now, 
        index: true 
    }
});

// 복합 인덱스 (선택 사항): 특정 시간대의 점수 데이터를 더 빨리 찾고 싶을 때 사용
sleepSchema.index({ createdAt: -1, actualScore: 1 });

module.exports = mongoose.model('Sleep', sleepSchema);