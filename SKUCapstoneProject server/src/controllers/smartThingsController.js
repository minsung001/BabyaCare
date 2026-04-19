const axios = require('axios');
const SmartThings = require('../models/SmartThings');

exports.registerSmartThings = async (req, res) => {
    try {
        const { token, email } = req.body;
        const userId = req.user.id; // verifyToken이 해독해 준 ID

        const stResponse = await axios.get('https://api.smartthings.com/v1/devices', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const devices = stResponse.data.items || [];

        // 보안 버전: userId를 기준으로 데이터 저장
        await SmartThings.findOneAndUpdate(
            { userId: userId },
            { userEmail: email, patToken: token, deviceCount: devices.length, updatedAt: Date.now() },
            { upsert: true, new: true }
        );

        res.status(200).json({ ok: true, message: '보안 연동 성공', devices });
    } catch (error) {
        console.error("ST_ERROR:", error.message);
        res.status(500).json({ ok: false, message: '서버 인증 에러' });
    }
};

exports.getUserDevices = async (req, res) => {
    try {
        const userId = req.user.id;
        const stInfo = await SmartThings.findOne({ userId: userId });
        if (!stInfo) return res.status(200).json({ ok: true, devices: [] });

        const response = await axios.get('https://api.smartthings.com/v1/devices', {
            headers: { 'Authorization': `Bearer ${stInfo.patToken}` }
        });
        res.status(200).json({ ok: true, devices: response.data.items });
    } catch (error) {
        res.status(500).json({ ok: false });
    }
};