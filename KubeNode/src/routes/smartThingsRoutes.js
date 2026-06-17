const express = require('express');
const router = express.Router();
const stController = require('../controllers/smartThingsController');
const { verifyToken } = require('../utils/authHelper');

router.post('/register', verifyToken, stController.registerSmartThings);
router.get('/devices', verifyToken, stController.getUserDevices);

// ✅ 추가
router.get('/status/:deviceId', verifyToken, stController.getDeviceStatus);
router.post('/control', verifyToken, stController.controlDevice);
router.get('/auto-control', verifyToken, stController.getAutoControl);
router.post('/auto-control', verifyToken, stController.setAutoControl);
router.post('/auto-control/:deviceId', verifyToken, stController.runAutoControl);

module.exports = router;