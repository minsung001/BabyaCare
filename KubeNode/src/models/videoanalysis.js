/**
 * Video.js
 * 비디오 스트림 데이터 모델
 */
const mongoose = require('mongoose');

// 타임스탬프, 아기 감지 여부, 체온, 정확도, 아기 좌표(정확도, 좌표는 제거 될 수도)
const videoAnalysisSchema = new mongoose.Schema({
    timestamp: {
        type: Date,
        default: Date.now
    },
    infantDetected: {
        type: Boolean,
        default: false
    },
    thermal: {
        type: Number,
        default: null
    },
    confidence: {
        type: Number,
        default: null
    },
    bbox: {
        x1: Number,
        y1: Number,
        x2: Number,
        y2: Number
    }
});

videoAnalysisSchema.index({ timestamp: -1 });

module.exports = {
    VideoAnalysis: mongoose.model('VideoAnalysis', videoAnalysisSchema)
};