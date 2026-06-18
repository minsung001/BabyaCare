/**
 * soundAnalysisRoutes.js
 * 울음 분석 요청 라우트
 */

const express = require('express');
const router = express.Router();
const soundAnalysisController = require('../controllers/soundAnalysisController');

/**
 * POST /api/sound-analysis/start
 * 음성 분석 시작
 */
router.post('/start', (req, res) => {
  soundAnalysisController.startAudioAnalysis(req, res);
});

/**
 * POST /api/sound-analysis/stop
 * 음성 분석 중지
 */
router.post('/stop', (req, res) => {
  soundAnalysisController.stopAudioAnalysis(req, res);
});

/**
 * GET /api/sound-analysis/results
 * 분석 결과 조회
 */
router.get('/results', (req, res) => {
  soundAnalysisController.getAnalysisResults(req, res);
});

/**
 * GET /api/sound-analysis/history
 * 분석 히스토리 조회
 */
router.get('/history', (req, res) => {
  soundAnalysisController.getAnalysisHistory(req, res);
});

/**
 * GET /api/sound-analysis/results/:date
 * 특정 날짜의 분석 결과 조회
 */
router.get('/results/:date', (req, res) => {
  soundAnalysisController.getResultsByDate(req, res);
});

module.exports = router;