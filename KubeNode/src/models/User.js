const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    username: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    verified: { type: Boolean, default: false },
    consentAt: { type: Date, required: true }, // 개인정보 동의 시각

    // ✅ A: 회원가입 시 필수
    babyBirth: { type: Date, required: true },
  },
  {
    timestamps: true,
    autoIndex: true // Mongoose가 인덱스 생성을 자동으로 관리하여 중복 경고를 방지합니다.
  }
);

module.exports = mongoose.model("User", userSchema);
