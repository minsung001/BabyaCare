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
    required: true
  },
  humidity: {
    type: Number,
    required: true
  },
  // 수면 점수 (나중에 계산해서 저장) 
  // 이거 왜 여기있는지 모르겠어서 일단은 주석
  // sleepScore: {
  //   type: Number,
  //   default: null
  // },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports =
  mongoose.models.TemperHumility ||
  mongoose.model('TemperHumility', temperHumilitySchema);