const express = require("express");
const router = express.Router();
// 1. 해당 기능을 담당하는 컨트롤러를 불러옵니다.
const aiController = require("../controllers/aiController");

/**
 * [POST] /api/ai/generate
 * 안드로이드나 다른 서비스에서 특정 데이터를 직접 보내서 AI 리포트를 만들고 싶을 때 사용합니다.
 */
router.post("/generate", aiController.createReport);

// 3. 이 라우터 설정을 내보냅니다.
module.exports = router;