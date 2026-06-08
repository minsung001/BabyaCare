const axios = require('axios');
const SmartThings = require('../models/SmartThings');
const User = require('../models/User');

const ST_API = 'https://api.smartthings.com/v1';

exports.registerSmartThings = async (req, res) => {
    const { token, email } = req.body;
    const userId = req.user.userId || req.user.id;

    console.log('\n[ST_PROCESS] ======= SmartThings 연동 시작 =======');
    console.log('[ST_INFO] 요청 유저:', email, userId);

    if (!token || token.length < 10) {
        return res.status(400).json({ ok: false, message: '유효한 SmartThings 토큰을 입력해주세요.' });
    }

    try {
        const userExists = await User.findById(userId);
        if (!userExists) {
            return res.status(404).json({ ok: false, message: '사용자 정보를 찾을 수 없습니다.' });
        }

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

        const mappedDevices = devices.map(device => {
            const mainComponent = (device.components || []).find(c => c.id === 'main') || {};
            const capabilities = (mainComponent.capabilities || []).map(c => c.id);
            const category = ((mainComponent.categories || [])[0]?.name) || 'Unknown';
            return {
                deviceId: device.deviceId,
                name: device.name,
                label: device.label || device.name,
                locationId: device.locationId,
                category,
                capabilities
            };
        });

        return res.status(200).json({
            ok: true,
            message: 'SmartThings 연동 및 기기 동기화가 완료되었습니다.',
            devices: mappedDevices
        });

    } catch (error) {
        console.error('\n[ST_CRITICAL_ERROR] 연동 실패 상세 로그:');
        if (error.response) {
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

        const devices = (response.data.items || []).map(device => {
            const mainComponent = (device.components || []).find(c => c.id === 'main') || {};
            const capabilities = (mainComponent.capabilities || []).map(c => c.id);
            const category = ((mainComponent.categories || [])[0]?.name) || 'Unknown';
            return {
                deviceId: device.deviceId,
                name: device.name,
                label: device.label || device.name,
                locationId: device.locationId,
                category,
                capabilities,
                status: 'online'
            };
        });

        return res.status(200).json({ ok: true, devices });

    } catch (error) {
        console.error('[ST_GET_ERROR] 기기 목록 로드 실패:', error.message);
        if (error.response && error.response.status === 401) {
            return res.status(401).json({ ok: false, message: '인증이 만료되었습니다. 다시 연동해주세요.' });
        }
        return res.status(500).json({ ok: false, message: '기기 목록을 가져오는 중 오류가 발생했습니다.' });
    }
};

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
        const switchValue = components?.switch?.switch?.value ?? null;
        const fanSpeed = components?.fanSpeed?.fanSpeed?.value ?? null;
        const temperature = components?.temperatureMeasurement?.temperature?.value ?? null;
        const humidity = components?.relativeHumidityMeasurement?.humidity?.value ?? null;
        const coolingSetpoint = components?.thermostatCoolingSetpoint?.coolingSetpoint?.value ?? null;

        console.log(`[ST_STATUS] deviceId: ${deviceId}, switch: ${switchValue}, fanSpeed: ${fanSpeed}, temp: ${temperature}`);

        res.status(200).json({ ok: true, deviceId, switch: switchValue, fanSpeed, temperature, humidity, coolingSetpoint });

    } catch (error) {
        console.error('[ST_STATUS_ERROR]', error.message);
        res.status(500).json({ ok: false, message: error.message });
    }
};

exports.controlDevice = async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const { deviceId, capability, command, value } = req.body;

        const stInfo = await SmartThings.findOne({ userId });
        if (!stInfo || !stInfo.patToken) {
            return res.status(404).json({ ok: false, message: 'SmartThings 토큰이 없습니다.' });
        }

        let commandBody;

        if (capability === 'switch') {
            if (command !== 'on' && command !== 'off') {
                return res.status(400).json({ ok: false, message: '잘못된 command입니다. (on/off)' });
            }
            commandBody = { component: 'main', capability: 'switch', command, arguments: [] };

        } else if (capability === 'fanSpeed') {
            let newSpeed;
            if (command === 'up') newSpeed = Math.min(4, parseInt(value) + 1);
            else if (command === 'down') newSpeed = Math.max(1, parseInt(value) - 1);
            else if (command === 'set') newSpeed = Math.max(1, Math.min(4, parseInt(value)));
            else return res.status(400).json({ ok: false, message: '잘못된 command입니다. (up/down/set)' });
            commandBody = { component: 'main', capability: 'fanSpeed', command: 'setFanSpeed', arguments: [newSpeed] };

        } else if (capability === 'thermostatCoolingSetpoint') {
            let newTemp;
            if (command === 'up') newTemp = Math.min(30, parseFloat(value) + 1);
            else if (command === 'down') newTemp = Math.max(16, parseFloat(value) - 1);
            else return res.status(400).json({ ok: false, message: '잘못된 command입니다. (up/down)' });
            commandBody = { component: 'main', capability: 'thermostatCoolingSetpoint', command: 'setCoolingSetpoint', arguments: [newTemp] };

        } else {
            return res.status(400).json({ ok: false, message: `지원하지 않는 capability입니다: ${capability}` });
        }

        await axios.post(
            `${ST_API}/devices/${deviceId}/commands`,
            { commands: [commandBody] },
            { headers: { Authorization: `Bearer ${stInfo.patToken}` }, timeout: 7000 }
        );

        console.log(`[ST_CONTROL] ${capability} → ${JSON.stringify(commandBody)}`);

        const statusRes = await axios.get(
            `${ST_API}/devices/${deviceId}/status`,
            { headers: { Authorization: `Bearer ${stInfo.patToken}` }, timeout: 7000 }
        );

        const comp = statusRes.data.components?.main;
        res.status(200).json({
            ok: true,
            switch: comp?.switch?.switch?.value ?? null,
            fanSpeed: comp?.fanSpeed?.fanSpeed?.value ?? null,
            temperature: comp?.temperatureMeasurement?.temperature?.value ?? null,
            humidity: comp?.relativeHumidityMeasurement?.humidity?.value ?? null,
            coolingSetpoint: comp?.thermostatCoolingSetpoint?.coolingSetpoint?.value ?? null
        });

    } catch (error) {
        console.error('[ST_CONTROL_ERROR]', error.message);
        res.status(500).json({ ok: false, message: error.message });
    }
};

exports.getAutoControl = async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const stInfo = await SmartThings.findOne({ userId });

        if (!stInfo) {
            return res.status(200).json({ ok: true, autoControl: false });
        }

        res.status(200).json({ ok: true, autoControl: stInfo.autoControl });

    } catch (error) {
        console.error('[AUTO_CONTROL_GET_ERROR]', error.message);
        res.status(500).json({ ok: false, message: error.message });
    }
};

exports.setAutoControl = async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const { autoControl } = req.body;

        await SmartThings.findOneAndUpdate(
            { userId },
            { autoControl, updatedAt: Date.now() }
        );

        console.log(`[AUTO_CONTROL] userId=${userId}, autoControl=${autoControl}`);

        res.status(200).json({ ok: true, autoControl });

    } catch (error) {
        console.error('[AUTO_CONTROL_SET_ERROR]', error.message);
        res.status(500).json({ ok: false, message: error.message });
    }
};

exports.runAutoControl = async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const { deviceId } = req.params;

        const stInfo = await SmartThings.findOne({ userId });
        if (!stInfo || !stInfo.patToken) {
            return res.status(404).json({ ok: false, message: 'SmartThings 토큰이 없습니다.' });
        }

        if (!stInfo.autoControl) {
            return res.status(200).json({ ok: true, message: '자동제어가 비활성화 상태입니다.' });
        }

        const statusRes = await axios.get(
            `${ST_API}/devices/${deviceId}/status`,
            { headers: { Authorization: `Bearer ${stInfo.patToken}` }, timeout: 7000 }
        );

        const comp = statusRes.data.components?.main;
        const currentSwitch = comp?.switch?.switch?.value ?? null;
        const currentFanSpeed = comp?.fanSpeed?.fanSpeed?.value ?? null;

        console.log(`[AUTO_CONTROL] 현재 스위치: ${currentSwitch}, 현재 팬속도: ${currentFanSpeed}`);

        return res.status(200).json({ ok: true, message: '자동제어는 DHT22 데이터 수신 시 자동 실행됩니다.' });

    } catch (error) {
        console.error('[AUTO_CONTROL_RUN_ERROR]', error.message);
        res.status(500).json({ ok: false, message: error.message });
    }
};

// 팬속도 계산 (습도 낮을수록 강하게)
const getTargetFanSpeed = (humidity) => {
    if (humidity >= 70) return 0; // 70% 이상 → 꺼짐
    if (humidity <= 40) return 4; // 40% 이하 → 최대
    if (humidity <= 50) return 3; // 41~50%
    return 2;                      // 51~69%
};

// DHT22 습도값으로 자동제어 (receiver.js에서 호출)
exports.onData = async (humidity) => {
    try {
        const allST = await SmartThings.find({ autoControl: true, patToken: { $exists: true } });

        for (const st of allST) {
            const devices = await axios.get(`${ST_API}/devices`, {
                headers: { Authorization: `Bearer ${st.patToken}` },
                timeout: 7000
            });

            const targets = (devices.data.items || []).filter(d => {
                const caps = (d.components || []).find(c => c.id === 'main')?.capabilities.map(c => c.id) || [];
                return caps.includes('switch') && caps.includes('fanSpeed');
            });

            for (const device of targets) {
                const targetSpeed = getTargetFanSpeed(humidity);

                const statusRes = await axios.get(
                    `${ST_API}/devices/${device.deviceId}/status`,
                    { headers: { Authorization: `Bearer ${st.patToken}` }, timeout: 7000 }
                );
                const comp = statusRes.data.components?.main;
                const currentSwitch = comp?.switch?.switch?.value ?? null;
                const currentFanSpeed = comp?.fanSpeed?.fanSpeed?.value ?? null;

                const commands = [];

                if (targetSpeed === 0) {
                    if (currentSwitch === 'on') {
                        commands.push({ component: 'main', capability: 'switch', command: 'off', arguments: [] });
                    }
                } else {
                    if (currentSwitch === 'off' || currentSwitch === null) {
                        commands.push({ component: 'main', capability: 'switch', command: 'on', arguments: [] });
                    }
                    if (currentFanSpeed !== targetSpeed) {
                        commands.push({ component: 'main', capability: 'fanSpeed', command: 'setFanSpeed', arguments: [targetSpeed] });
                    }
                }

                if (commands.length === 0) {
                    console.log(`[ST_AUTO] 변경사항 없음 (습도: ${humidity}%)`);
                    continue;
                }

                await axios.post(
                    `${ST_API}/devices/${device.deviceId}/commands`,
                    { commands },
                    { headers: { Authorization: `Bearer ${st.patToken}` }, timeout: 7000 }
                );

                console.log(`[ST_AUTO] 습도 ${humidity}% → 팬속도 ${targetSpeed}`);
            }
        }
    } catch (err) {
        console.error('[ST_AUTO_ERROR]', err.message);
    }
};