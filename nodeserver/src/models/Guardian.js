const mongoose = require("mongoose");

const guardianSchema = new mongoose.Schema(
  {
    // 이 가정(데이터)의 기준이 되는 주 보호자(OWNER)
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // 구성원 (OWNER 자기 자신 or SUB)
    memberId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    role: { type: String, enum: ["OWNER", "SUB"], required: true },
  },
  { timestamps: true }
);

// 한 ownerId 아래에 같은 memberId 중복 등록 방지
guardianSchema.index({ ownerId: 1, memberId: 1 }, { unique: true });

module.exports = mongoose.model("Guardian", guardianSchema);
