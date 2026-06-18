/**
 * SoundAnalysis.js
 * 울음 분석 데이터 모델
 */

const mongoose = require('mongoose');

// 울음 분석 결과 스키마
const soundAnalysisResultSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  },
  audioTimestamp: {
    type: Number,
    required: true
  },
  audioFilePath: {
    type: String
  },
  analysisResult: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  soundType: {
    type: String,
    enum: ['cry', 'laugh', 'noise', 'speech', 'other', 'unknown']
  },
  confidence: {
    type: Number,
    min: 0,
    max: 100,
    required: true
  },
  duration: {
    type: Number // 오디오 길이 (초)
  },
  frequency: {
    low: Number,
    mid: Number,
    high: Number
  },
  amplitude: {
    type: Number
  },
  status: {
    type: String,
    enum: ['success', 'failed', 'pending'],
    default: 'pending'
  },
  errorMessage: String,
  processingTime: {
    type: Number // 밀리초
  }
});

// 울음 분석 세션 스키마
const soundAnalysisSessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: Date,
  isActive: {
    type: Boolean,
    default: true
  },
  totalAnalysisRequests: {
    type: Number,
    default: 0
  },
  successfulAnalysis: {
    type: Number,
    default: 0
  },
  failedAnalysis: {
    type: Number,
    default: 0
  },
  analysisResults: [soundAnalysisResultSchema],
  detectedSoundTypes: {
    cry: { type: Number, default: 0 },
    laugh: { type: Number, default: 0 },
    noise: { type: Number, default: 0 },
    speech: { type: Number, default: 0 },
    other: { type: Number, default: 0 },
    unknown: { type: Number, default: 0 }
  },
  averageConfidence: {
    type: Number,
    min: 0,
    max: 100
  },
  duration: {
    type: Number // 밀리초
  }
});

// 울음 분류 통계 스키마
const soundClassificationStatsSchema = new mongoose.Schema({
  date: {
    type: Date,
    default: Date.now
  },
  totalAnalysis: {
    type: Number,
    default: 0
  },
  bySoundType: {
    cry: { type: Number, default: 0 },
    laugh: { type: Number, default: 0 },
    noise: { type: Number, default: 0 },
    speech: { type: Number, default: 0 },
    other: { type: Number, default: 0 },
    unknown: { type: Number, default: 0 }
  },
  averageConfidence: {
    type: Number,
    min: 0,
    max: 100
  },
  topDetectedSound: String,
  highestConfidence: {
    type: Number,
    min: 0,
    max: 100
  }
});

// 인덱스
soundAnalysisResultSchema.index({ timestamp: -1 });
soundAnalysisResultSchema.index({ soundType: 1 });
soundAnalysisSessionSchema.index({ startTime: -1 });
soundAnalysisSessionSchema.index({ isActive: 1 });
soundClassificationStatsSchema.index({ date: -1 });

module.exports = {
  SoundAnalysisResult: mongoose.model('SoundAnalysisResult', soundAnalysisResultSchema),
  SoundAnalysisSession: mongoose.model('SoundAnalysisSession', soundAnalysisSessionSchema),
  SoundClassificationStats: mongoose.model('SoundClassificationStats', soundClassificationStatsSchema)
};