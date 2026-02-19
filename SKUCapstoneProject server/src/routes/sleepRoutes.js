const express = require('express');
const router = express.Router();
const sleepController = require('../controllers/sleepController');

router.post('/seed', sleepController.seedMLData); // 초기 가공데이터 생성
router.get('/analysis', sleepController.getSleepAnalysis); // 안드로이드 점수 조회
router.get('/gpt-report', sleepController.getReportPayload); // GPT 리포트용 데이터 뽑기

module.exports = router;