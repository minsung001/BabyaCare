const express = require("express");
const router = express.Router();
const aiController = require("../controllers/aiController");

// [POST] /api/ai/generate - 수동으로 보고서 생성 요청
router.post("/generate", aiController.createReport);

// [GET] /api/ai/report/latest - 최신 보고서 조회 ✅ 추가
router.get("/report/latest", aiController.getLatestReport);

module.exports = router;