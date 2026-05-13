const TemperHumility = require('../models/TemperHumility');

const TEMP_HIGH = 28;
const TEMP_LOW = 18;
const RAPID_TEMP_CHANGE = 3;

/**
 * 위험 상태 검사 + Socket 알림
 */
const checkDangerCondition = async (userId, temperature, io) => {
    try {
        const latest = await TemperHumility.findOne({ userId }).sort({ timestamp: -1 });

        if (temperature >= TEMP_HIGH) {
            console.log(`[고온 감지] ${temperature}도`);
            if (io) {
                io.to(userId).emit('temperatureAlert', {
                    type: 'HIGH_TEMPERATURE',
                    userId,
                    temperature,
                    message: `실내 온도가 너무 높습니다 (${temperature}°C)`
                });
            }
        }

        if (temperature <= TEMP_LOW) {
            console.log(`[저온 감지] ${temperature}도`);
            if (io) {
                io.to(userId).emit('temperatureAlert', {
                    type: 'LOW_TEMPERATURE',
                    userId,
                    temperature,
                    message: `실내 온도가 너무 낮습니다 (${temperature}°C)`
                });
            }
        }

        if (latest) {
            const diff = temperature - latest.temperature;

            if (diff >= RAPID_TEMP_CHANGE) {
                console.log(`[온도 급상승] ${latest.temperature} → ${temperature}`);
                if (io) {
                    io.to(userId).emit('temperatureAlert', {
                        type: 'RAPID_TEMP_RISE',
                        userId,
                        before: latest.temperature,
                        current: temperature,
                        diff,
                        message: `온도가 급격히 상승했습니다 (${diff.toFixed(1)}°C)`
                    });
                }
            }

            if (diff <= -RAPID_TEMP_CHANGE) {
                console.log(`[온도 급하락] ${latest.temperature} → ${temperature}`);
                if (io) {
                    io.to(userId).emit('temperatureAlert', {
                        type: 'RAPID_TEMP_DROP',
                        userId,
                        before: latest.temperature,
                        current: temperature,
                        diff,
                        message: `온도가 급격히 하락했습니다 (${Math.abs(diff).toFixed(1)}°C)`
                    });
                }
            }
        }
    } catch (error) {
        console.error('[위험 상태 검사 실패]', error.message);
    }
};

/**
 * 1. IoT → Node.js 데이터 수신
 */
exports.receiveSensorData = async (req, res, io) => {
    try {
        const { temperature, humidity, userId } = req.body;

        if (temperature === undefined || humidity === undefined || !userId) {
            return res.status(400).json({ message: '온도, 습도 및 사용자 ID 정보가 필요합니다.' });
        }

        const latestSleep = await TemperHumility.findOne({ userId }).sort({ timestamp: -1 });

        const sensorData = new TemperHumility({
            userId,
            temperature,
            humidity,
            sleepScore: latestSleep?.sleepScore || null,
            timestamp: new Date()
        });

        await sensorData.save();
        console.log(`[DB 저장 완료] userId=${userId}, temp=${temperature}, hum=${humidity}`);

        await checkDangerCondition(userId, temperature, io);

        res.status(200).json({ success: true, message: '센서 데이터 저장 완료', data: sensorData });

    } catch (error) {
        console.error('[센서 저장 실패]', error.message);
        res.status(500).json({ success: false, message: '센서 데이터 저장 실패', error: error.message });
    }
};

/**
 * 2. Android → 최신 데이터 조회
 */
exports.getLatestData = async (req, res) => {
    const { userId } = req.query;
    try {
        const query = userId ? { userId } : {};
        const latestData = await TemperHumility.findOne(query).sort({ timestamp: -1 });

        if (!latestData) {
            return res.status(404).json({ message: "저장된 데이터가 없습니다." });
        }

        res.status(200).json(latestData);
    } catch (error) {
        res.status(500).json({ message: "데이터 조회 중 오류 발생", error: error.message });
    }
};

/**
 * 3. Android → 수면점수 변화 그래프용 데이터
 */
exports.getSleepScoreHistory = async (req, res) => {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({ message: "userId 필요" });
    }

    try {
        const history = await TemperHumility.find({ userId, sleepScore: { $ne: null } })
            .sort({ timestamp: 1 })
            .select("sleepScore timestamp");

        const formatted = history.map(item => ({ score: item.sleepScore, time: item.timestamp }));
        res.status(200).json(formatted);
    } catch (error) {
        res.status(500).json({ message: "수면점수 조회 실패", error: error.message });
    }
};

exports.getHistoryData = exports.getSleepScoreHistory;

/**
 * 4. 버퍼 데이터 DB 저장 (app.js setInterval로 주기적 호출)
 */
let dataBuffer = [];

exports.addToBuffer = (data) => {
    dataBuffer.push(data);
};

exports.saveBufferToDB = async () => {
    if (dataBuffer.length === 0) return;

    const toSave = [...dataBuffer];
    dataBuffer = [];

    try {
        await TemperHumility.insertMany(toSave);
        console.log(`[Buffer] ${toSave.length}건 DB 저장 완료`);
    } catch (err) {
        console.error('[Buffer] DB 저장 실패:', err.message);
        dataBuffer = [...toSave, ...dataBuffer];
    }
};

/**
 * 5. 울음 감지 이벤트 저장 + 소켓 알림
 */
exports.saveCryEvent = async (userId, cryProbability, io) => {
    try {
        const latestSleep = await TemperHumility.findOne({ userId }).sort({ timestamp: -1 });

        const cryData = new TemperHumility({
            userId,
            temperature: latestSleep?.temperature || null,
            humidity: latestSleep?.humidity || null,
            sleepScore: latestSleep?.sleepScore || null,
            isCrying: 1,
            cryProbability,
            timestamp: new Date()
        });

        await cryData.save();
        console.log(`[CryEvent] userId=${userId}, probability=${cryProbability} 저장 완료`);

        if (io) {
            io.to(userId).emit('cryAlert', {
                type: 'CRY_DETECTED',
                userId,
                cryProbability,
                message: '아기 울음이 감지되었습니다!'
            });
        }
    } catch (err) {
        console.error('[CryEvent] 저장 실패:', err.message);
    }
};