/**
 * Video.js
 * 비디오 스트림 데이터 모델
 */

const mongoose = require('mongoose');

// 비디오 분석 결과 스키마
const videoAnalysisSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  },

  frameTimestamp: {
    type: Number,
    required: true
  },
  analysisResult: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },

  confidence: {
    type: Number,
    min: 0,
    max: 100
  },

  detectedObjects: [{
    name: String,
    confidence: Number,
    bbox: {
      x: Number,
      y: Number,
      width: Number,
      height: Number
    }
  }],
  
  status: {
    type: String,
    enum: ['success', 'failed', 'pending'],
    default: 'pending'
  },
  errorMessage: String
});

// 비디오 스트림 세션 스키마
const videoStreamSessionSchema = new mongoose.Schema({
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
  iotCameraUrl: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  totalFramesProcessed: {
    type: Number,
    default: 0
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
  analysisResults: [videoAnalysisSchema],
  connectedAndroidClients: {
    type: Number,
    default: 0
  },
  duration: {
    type: Number // 밀리초
  }
});

// 인덱스
videoStreamSessionSchema.index({ startTime: -1 });
videoStreamSessionSchema.index({ isActive: 1 });
videoAnalysisSchema.index({ timestamp: -1 });

module.exports = {
  VideoAnalysis: mongoose.model('VideoAnalysis', videoAnalysisSchema),
  VideoStreamSession: mongoose.model('VideoStreamSession', videoStreamSessionSchema)
};