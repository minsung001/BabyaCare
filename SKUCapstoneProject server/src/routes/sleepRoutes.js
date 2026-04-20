const express = require('express');
const router = express.Router();
const sleepController = require('../controllers/sleepController');

router.post('/seed', sleepController.seedMLData); // 학습용 가짜 데이터 생성
router.get('/analysis', sleepController.getSleepAnalysis); // 안드로이드에서 점수/상태 조회
router.get('/gpt-report', sleepController.getReportPayload); // GPT 리포트 생성용

module.exports = router;