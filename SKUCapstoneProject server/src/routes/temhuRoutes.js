const express = require('express');
const router = express.Router();
const temhuController = require('../controllers/TemhuController');

// Android → 최신 데이터: GET /api/temhu/latest
router.get('/latest', temhuController.getLatestData);

// ✅ Android → 이력 데이터: GET /api/temhu/history
router.get('/history', temhuController.getHistoryData);

module.exports = router;