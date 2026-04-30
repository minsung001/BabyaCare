const express = require('express');
const router = express.Router();
const stController = require('../controllers/smartThingsController');
const { verifyToken } = require('../utils/authHelper');

router.post('/register', verifyToken, stController.registerSmartThings);
router.get('/devices', verifyToken, stController.getUserDevices);

module.exports = router;