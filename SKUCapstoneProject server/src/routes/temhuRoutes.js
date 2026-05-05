const express = require('express');
const router = express.Router();
const temhuController = require('../controllers/TemhuController');

// 센서가 데이터를 보낼 때: POST /api/temhu
router.post('/', temhuController.receiveSensorData);


// 안드로이드가 데이터를 가져갈 때: GET /api/temhu/latest
router.get('/latest', temhuController.getLatestData);

module.exports = router;