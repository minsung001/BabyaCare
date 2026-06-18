const Guardian = require("../models/Guardian");
const User = require("../models/User");
const { resolveOwnerIdForUser } = require("../utils/authHelper");

// 보호자 목록 조회
exports.list = async (req, res) => {
  try {
    const ownerId = await resolveOwnerIdForUser(req.userId);
    const list = await Guardian.find({ ownerId }).lean();
    const memberIds = list.map((g) => g.memberId);

    const users = await User.find({ _id: { $in: memberIds } }, { email: 1, username: 1 }).lean();
    const map = new Map(users.map((u) => [String(u._id), { email: u.email, username: u.username }]));

    return res.json({
      ok: true,
      ownerId,
      guardians: list.map((g) => ({
        memberId: g.memberId,
        role: g.role,
        email: map.get(String(g.memberId))?.email || "",
        username: map.get(String(g.memberId))?.username || "",
      })),
    });
  } catch (e) {
    console.error("guardians list error:", e);
    return res.status(500).json({ ok: false, message: "server error" });
  }
};

// 보조 보호자 추가
exports.add = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ ok: false, message: "email required" });

    const normalizedEmail = email.toLowerCase().trim();
    const target = await User.findOne({ email: normalizedEmail });
    if (!target) return res.status(404).json({ ok: false, message: "user not found" });

    if (String(target._id) === String(req.userId)) return res.status(400).json({ ok: false, message: "cannot add self" });

    const already = await Guardian.findOne({ ownerId: req.userId, memberId: target._id });
    if (already) return res.status(409).json({ ok: false, message: "already guardian" });

    const count = await Guardian.countDocuments({ ownerId: req.userId });
    if (count >= 2) return res.status(400).json({ ok: false, message: "max 2 guardians" });

    await Guardian.create({ ownerId: req.userId, memberId: target._id, role: "SUB" });
    return res.json({ ok: true });
  } catch (e) {
    console.error("guardians add error:", e);
    return res.status(500).json({ ok: false, message: "server error" });
  }
};

// 보조 보호자 삭제
exports.remove = async (req, res) => {
  try {
    const memberId = req.params.memberId;
    if (String(memberId) === String(req.userId)) return res.status(400).json({ ok: false, message: "cannot remove owner" });

    const r = await Guardian.deleteOne({ ownerId: req.userId, memberId, role: "SUB" });
    return res.json({ ok: true, deleted: r.deletedCount });
  } catch (e) {
    console.error("guardians remove error:", e);
    return res.status(500).json({ ok: false, message: "server error" });
  }
};