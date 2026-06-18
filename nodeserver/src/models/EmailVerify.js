const mongoose = require("mongoose");

const EmailVerifySchema = new mongoose.Schema(
  {
    email: { type: String, required: true, index: true },
    code: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: true },
    verified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// 같은 이메일에 인증코드 여러개 쌓이는 거 방지(선택)
EmailVerifySchema.index({ email: 1 }, { unique: false });

module.exports = mongoose.model("EmailVerify", EmailVerifySchema);
