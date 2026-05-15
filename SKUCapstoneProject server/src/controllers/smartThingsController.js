const axios = require('axios');
const SmartThings = require('../models/SmartThings');
const User = require('../models/User');

const ST_API = 'https://api.smartthings.com/v1';

// ==========================================
// 기존 기능
// ==========================================

exports.registerSmartThings = async (req, res) => {
    const { token, email } = req.body;
    const userId = req.user.userId || req.user.id;

    console.log('\n[ST_PROCESS] ======= SmartThings 연동 시작 =======');
    console.log('[ST_INFO] 요청 유저:', email, userId);

    if (!token || token.length < 10) {
        return res.status(400).json({
            ok: false,
            message: '유효한 SmartThings 토큰을 입력해주세요.'
        });
    }

    try {
        const userExists = await User.findById(userId);
        if (!userExists) {
            return res.status(404).json({ ok: false, message: '사용자 정보를 찾을 수 없습니다.' });
        }

        console.log('[ST_API] 삼성 서버로 기기 목록 요청 중...');

        const stResponse = await axios.get(`${ST_API}/devices`, {
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            timeout: 7000
        });

        const devices = stResponse.data.items || [];
        console.log(`[ST_API] 삼성 서버 응답 성공. 발견된 기기: ${devices.length}개`);

        const updatedData = await SmartThings.findOneAndUpdate(
            { userId },
            { userEmail: email, patToken: token, deviceCount: devices.length, updatedAt: Date.now() },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        console.log('[ST_DB] MongoDB 저장 완료:', updatedData._id);

        const mappedDevices = devices.map(device => ({
            deviceId: device.deviceId,
            name: device.name,
            label: device.label || device.name,
            deviceTypeName: device.deviceTypeName,
            locationId: device.locationId
        }));

        return res.status(200).json({
            ok: true,
            message: 'SmartThings 연동 및 기기 동기화가 완료되었습니다.',
            devices: mappedDevices
        });

    } catch (error) {
        console.error('\n[ST_CRITICAL_ERROR] 연동 실패 상세 로그:');
        if (error.response) {
            console.error('삼성 API 에러 코드:', error.response.status);
            return res.status(401).json({ ok: false, message: '삼성 인증 토큰이 유효하지 않거나 만료되었습니다.' });
        }
        if (error.request) {
            return res.status(503).json({ ok: false, message: '삼성 서버와 통신할 수 없습니다.' });
        }
        return res.status(500).json({ ok: false, message: '서버 내부 처리 중 오류가 발생했습니다.' });
    }
};

exports.getUserDevices = async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const stInfo = await SmartThings.findOne({ userId });

        if (!stInfo || !stInfo.patToken) {
            return res.status(200).json({ ok: true, devices: [], message: '연동된 기기가 없습니다.' });
        }

        const response = await axios.get(`${ST_API}/devices`, {
            headers: { Authorization: `Bearer ${stInfo.patToken}` },
            timeout: 7000
        });

        const devices = (response.data.items || []).map(device => ({
            deviceId: device.deviceId,
            name: device.name,
            label: device.label || device.name,
            deviceTypeName: device.deviceTypeName,
            locationId: device.locationId,
            status: 'online'
        }));

        return res.status(200).json({ ok: true, devices });

    } catch (error) {
        console.error('[ST_GET_ERROR] 기기 목록 로드 실패:', error.message);
        if (error.response && error.response.status === 401) {
            return res.status(401).json({ ok: false, message: '인증이 만료되었습니다. 다시 연동해주세요.' });
        }
        return res.status(500).json({ ok: false, message: '기기 목록을 가져오는 중 오류가 발생했습니다.' });
    }
};

// ==========================================
// ✅ 추가: 디바이스 상태 조회 (온도/습도)
// ==========================================

exports.getDeviceStatus = async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const { deviceId } = req.params;

        const stInfo = await SmartThings.findOne({ userId });
        if (!stInfo || !stInfo.patToken) {
            return res.status(404).json({ ok: false, message: 'SmartThings 토큰이 없습니다.' });
        }

        const response = await axios.get(
            `${ST_API}/devices/${deviceId}/status`,
            { headers: { Authorization: `Bearer ${stInfo.patToken}` }, timeout: 7000 }
        );

        const components = response.data.components?.main;
        const temperature = components?.temperatureMeasurement?.temperature?.value ?? null;
        const humidity = components?.relativeHumidityMeasurement?.humidity?.value ?? null;

        console.log(`[ST_STATUS] deviceId: ${deviceId}, temp: ${temperature}, humid: ${humidity}`);

        res.status(200).json({ ok: true, deviceId, temperature, humidity });

    } catch (error) {
        console.error('[ST_STATUS_ERROR]', error.message);
        res.status(500).json({ ok: false, message: error.message });
    }
};

// ==========================================
// ✅ 추가: 디바이스 제어 (온도/습도 올리기/내리기)
// ==========================================

exports.controlDevice = async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const { deviceId, capability, command, value } = req.body;

        const stInfo = await SmartThings.findOne({ userId });
        if (!stInfo || !stInfo.patToken) {
            return res.status(404).json({ ok: false, message: 'SmartThings 토큰이 없습니다.' });
        }

        // 올리기/내리기 계산
        let newValue;
        if (command === 'up') {
            newValue = parseFloat((parseFloat(value) + 1).toFixed(1));
        } else if (command === 'down') {
            newValue = parseFloat((parseFloat(value) - 1).toFixed(1));
        } else {
            return res.status(400).json({ ok: false, message: '잘못된 command입니다. (up/down)' });
        }

        // 범위 제한
        if (capability === 'temperatureMeasurement') {
            newValue = Math.max(16, Math.min(35, newValue)); // 16°C ~ 35°C
        } else if (capability === 'relativeHumidityMeasurement') {
            newValue = Math.max(0, Math.min(100, newValue)); // 0% ~ 100%
        }

        // SmartThings 가상 디바이스 명령 전송
        const commandName = capability === 'temperatureMeasurement'
            ? 'setTemperature'
            : 'setHumidity';

        await axios.post(
            `${ST_API}/devices/${deviceId}/commands`,
            {
                commands: [{
                    component: 'main',
                    capability,
                    command: commandName,
                    arguments: [newValue]
                }]
            },
            { headers: { Authorization: `Bearer ${stInfo.patToken}` }, timeout: 7000 }
        );

        console.log(`[ST_CONTROL] ${capability} → ${newValue}`);

        // 최신 상태 다시 조회해서 반환
        const statusRes = await axios.get(
            `${ST_API}/devices/${deviceId}/status`,
            { headers: { Authorization: `Bearer ${stInfo.patToken}` }, timeout: 7000 }
        );

        const components = statusRes.data.components?.main;
        const temperature = components?.temperatureMeasurement?.temperature?.value ?? null;
        const humidity = components?.relativeHumidityMeasurement?.humidity?.value ?? null;

        res.status(200).json({ ok: true, temperature, humidity });

    } catch (error) {
        console.error('[ST_CONTROL_ERROR]', error.message);
        res.status(500).json({ ok: false, message: error.message });
    }
};