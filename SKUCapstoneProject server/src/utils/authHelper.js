const jwt = require('jsonwebtoken'); // 🚀 1. jwt 추가
const Guardian = require("../models/Guardian");

// 🚀 2. 보안 검문소 (verifyToken) 추가
exports.verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ ok: false, message: '인증 토큰이 없습니다.' });
    }

    // .env에 있는 JWT_SECRET을 사용하거나 기본값을 씁니다.
    jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key', (err, user) => {
        if (err) return res.status(403).json({ ok: false, message: '유효하지 않은 토큰입니다.' });
        
        req.user = user; // 👈 이게 있어야 컨트롤러에서 req.user.id를 쓸 수 있어!
        next();
    });
};

// 기존 IP 정보 추출 유틸
exports.getClientInfo = (req) => {
  const ip = (req.headers["x-forwarded-for"]?.toString().split(",")[0] || "").trim() || req.socket?.remoteAddress || "";
  const userAgent = req.headers["user-agent"] || "";
  return { ip, userAgent };
};

// 기존 OwnerId 확인 유틸
exports.resolveOwnerIdForUser = async (userId) => {
  const owner = await Guardian.findOne({ memberId: userId, role: "OWNER" });
  if (owner) return owner.ownerId;
  const sub = await Guardian.findOne({ memberId: userId, role: "SUB" });
  if (sub) return sub.ownerId;
  return userId;
};