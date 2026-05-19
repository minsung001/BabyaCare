const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    usernameTried: {
      type: String,
      default: "",
    },

    ip: {
      type: String,
      default: "",
    },

    userAgent: {
      type: String,
      default: "",
    },

    success: {
      type: Boolean,
      required: true,
    },

    reason: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true, // ⭐ 로그인 시간 자동 저장
  }
);

module.exports = mongoose.model("LoginHistory", schema);
