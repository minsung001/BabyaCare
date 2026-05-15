

const express = require("express");
const router = express.Router();
const authCtrl = require("../controllers/authController");

// 1. 회원가입용 이메일 인증번호 요청
router.post("/request-verify", authCtrl.requestVerify);

// 1-2. 비밀번호 재설정용 이메일 인증번호 요청 (추가된 부분)
router.post("/request-reset-verify", authCtrl.requestResetVerify);

// 2. 이메일 인증번호 확인
router.post("/verify-code", authCtrl.verifyCode);

// 3. 회원가입
router.post("/signup", authCtrl.signup);

// 4. 로그인
router.post("/login", authCtrl.login);

// 5. 토큰 갱신
router.post("/refresh", authCtrl.refresh);

// 6. 비밀번호 재설정
router.post("/reset-password", authCtrl.resetPassword);

// 7. 개인정보 수정 (필드명: username, babyBirth 반영)
router.put("/update-profile", authCtrl.updateProfile);
module.exports = router;