const mongoose = require('mongoose');

const sleepSchema = new mongoose.Schema({
    temp: Number,
    humidity: Number,
    noise: Number,
    light: Number,
    noseX: Number, // 움직임 감지용
    actualScore: Number, // 모델 학습용 정답지 (논문 기반 가공 데이터 or 부모 피드백)
    time: String,
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Sleep', sleepSchema);