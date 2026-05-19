/**
 * SoundAnalysis.js
 * 울음 분석 데이터 모델
 */

const mongoose = require('mongoose');

// 울음 분석 결과 스키마
// 감지시 새 도큐먼트 생성
// 끝날 시 마지막 도큐먼트 수정
const soundAnalysisResultSchema = new mongoose.Schema({
    cry_start_Time: { 
      type: Date, 
      required: true 
    },
    cry_end_Time: { 
      type: Date,
      default: null 
    }
});

// 노이즈를 어떤식으로 저장할지 모름
// 1초마다 저장하는건 좀 아닌것 같아서

// 인덱스
soundAnalysisResultSchema.index({ timestamp: -1 });
soundAnalysisResultSchema.index({ soundType: 1 });


module.exports = {
  SoundAnalysisResult: mongoose.model('SoundAnalysisResult', soundAnalysisResultSchema),
};