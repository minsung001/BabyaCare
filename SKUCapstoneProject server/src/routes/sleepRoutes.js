const express = require('express');
const router = express.Router();
const sleepController = require('../controllers/sleepController'); // ⚠️ 파일명 끝에 's' 붙었는지 확인 (sleepControllers인지 sleepController인지)

// 1. (학습용) Seed 데이터 생성
router.post('/seed', sleepController.seedMLData);

// 2. 실시간 분석 조회 (안드로이드에서 호출)
router.get('/analysis', sleepController.getSleepAnalysis);

// 3. Flask에서 분석 결과를 보낼 때 받는 통로 (이거 꼭 있어야 Flask랑 연동됨)
router.post('/record', sleepController.recordAnalysisResult);

// 4. GPT 리포트 생성 (이름을 generate8AMReport 또는 getReportPayload 중 컨트롤러에 쓴 걸로 맞춰야 함)
router.get('/gpt-report', sleepController.getReportPayload || sleepController.generate8AMReport);

module.exports = router;