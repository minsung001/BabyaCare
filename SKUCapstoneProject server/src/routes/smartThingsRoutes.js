const express = require('express');
const router = express.Router();
const stController = require('../controllers/smartThingsController');
const { verifyToken } = require('../utils/authHelper');

router.post('/register', verifyToken, stController.registerSmartThings);
router.get('/devices', verifyToken, stController.getUserDevices);

// ✅ 추가
router.get('/status/:deviceId', verifyToken, stController.getDeviceStatus);
router.post('/control', verifyToken, stController.controlDevice);

module.exports = router;