/**
 * soundAnalysisRoutes.js
 * 울음 분석 요청 라우트
 */

const express = require('express');
const router = express.Router();
const soundAnalysisController = require('../controllers/soundAnalysisController');

/**
 * POST /api/sound-analysis/analyze
 * 단일 오디오 파일 울음 분석
 * Body: { audioPath: string, audioBase64: string, timestamp: number }
 */
router.post('/analyze', (req, res) => {
  soundAnalysisController.analyzeSound(req, res);
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
 * Query: ?limit=20
 */
router.get('/history', (req, res) => {
  soundAnalysisController.getAnalysisHistory(req, res);
});

/**
 * POST /api/sound-analysis/batch
 * 배치 울음 분석 (여러 오디오 파일)
 * Body: { audioFiles: [{ audioPath: string, timestamp: number }, ...] }
 */
router.post('/batch', (req, res) => {
  soundAnalysisController.analyzeBatch(req, res);
});

/**
 * GET /api/sound-analysis/results/:date
 * 특정 날짜의 분석 결과 조회
 * Params: date (YYYY-MM-DD 형식)
 */
router.get('/results/:date', (req, res) => {
  soundAnalysisController.getResultsByDate(req, res);
});

module.exports = router;