const mongoose = require('mongoose');

const temperHumilitySchema = new mongoose.Schema({
<<<<<<< HEAD
  // 💡 어떤 사용자의 데이터인지 구분하기 위해 추가
  userId: {
    type: String,
    required: true,
    index: true // 조회를 빠르게 하기 위해 인덱스 추가
  },
=======
>>>>>>> kgj
  temperature: {
    type: Number,
    required: true
  },
  humidity: {
    type: Number,
    required: true
  },
<<<<<<< HEAD
  // 😴 수면 점수도 나중에 저장될 수 있으니 미리 추가해두면 좋습니다
  sleepScore: {
    type: Number,
    default: null
  },
=======
>>>>>>> kgj
  timestamp: {
    type: Date,
    default: Date.now
  }
});

<<<<<<< HEAD
// 모델 이름 중복 에러 방지를 위한 처리 (안전하게)
module.exports = mongoose.models.TemperHumility || mongoose.model('TemperHumility', temperHumilitySchema);
=======
module.exports = mongoose.model('TemperHumility', temperHumilitySchema);
>>>>>>> kgj
