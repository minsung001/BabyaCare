const mongoose = require('mongoose');

const temperHumilitySchema = new mongoose.Schema({

  // 어떤 사용자 데이터인지 구분
  userId: {
    type: String,
    required: true,
    index: true
  },

  temperature: {
    type: Number,
    default: null
  },

  humidity: {
    type: Number,
    default: null
  },

  // 소음 (10분 평균 dB)
  noise: {
    type: Number,
    default: null
  },

  // 울음 감지 여부
  cryDetected: {
    type: Boolean,
    default: false
  },

  // 울음 확률
  cryProbability: {
    type: Number,
    default: null
  },

  // 수면 점수 (저장 시 즉시 계산)
  sleepScore: {
    type: Number,
    default: null
  },

  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports =
  mongoose.models.TemperHumility ||
  mongoose.model('TemperHumility', temperHumilitySchema);