const express = require('express');
const router = express.Router();
const sleepController = require('../controllers/sleepController');

// 1. Seed 데이터 생성
router.post('/seed', sleepController.seedMLData);

// 2. 실시간 분석 조회
router.get('/analysis', sleepController.getSleepAnalysis);

// 3. Flask 분석 결과 수신
router.post('/record', sleepController.recordAnalysisResult);

// ✅ 4. GPT 리포트 생성 - 실제 존재하는 함수로 변경
router.get('/gpt-report', sleepController.generateDailyComprehensiveReport);

module.exports = router;