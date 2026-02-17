const express = require('express');
const router = express.Router();
const sleepController = require('../controllers/sleepController');

router.get('/data', sleepController.getAnalyzedData);
router.post('/seed', sleepController.seedData);

module.exports = router;