const express = require('express');
const router = express.Router();
const policyController = require('../controllers/policyController');

// GET /api/policies 경로로 요청이 오면 컨트롤러 실행
router.get('/', policyController.getAllPolicies);

module.exports = router;