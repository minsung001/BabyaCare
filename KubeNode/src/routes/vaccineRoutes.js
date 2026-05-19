const express = require('express');
const router = express.Router();
const vaccineController = require('../controllers/vaccineController');

router.get('/schedule/:userId', vaccineController.getVaccineSchedule);

module.exports = router;