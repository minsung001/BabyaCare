const express = require('express');
const router = express.Router();
const stController = require('../controllers/smartThingsController');
const { verifyToken } = require('../utils/authHelper'); // 🚀 이제 인식 성공!

// 보안 통과 후 컨트롤러 실행
router.post('/register', verifyToken, stController.registerSmartThings);
router.get('/devices', verifyToken, stController.getUserDevices);

module.exports = router;