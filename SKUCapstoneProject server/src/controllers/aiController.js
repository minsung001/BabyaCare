// src/controllers/aiController.js
const aiModel = require("../models/ai");

/**
 * [Internal/External] AI 리포트 생성을 관리하는 컨트롤러
 */
exports.createReport = async (req, res) => {
  try {
    // 1. 요청 데이터 가져오기 (8시 자동 생성 시에는 sleepController가 데이터를 직접 넘겨줌)
    //    안드로이드에서 직접 요청할 때는 req.body를 사용함.
    const data = req.body;

    if (!data || Object.keys(data).length === 0) {
      return res.status(400).json({ success: false, message: "분석할 데이터가 부족합니다." });
    }

    // 2. 모델(AI 엔진)에 데이터 전달하여 GPT 답변 생성
    const reportContent = await aiModel.generateAiReport(data);

    // 3. 성공 응답
    res.status(200).json({
      success: true,
      data: reportContent
    });
  } catch (error) {
    console.error("AI 리포트 생성 중 에러 발생:", error);
    res.status(500).json({
      success: false,
      message: "AI 리포트를 생성하는 중에 문제가 발생했습니다."
    });
  }
};