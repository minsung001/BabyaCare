const TemperHumility = require('../models/TemperHumility');
const smartThingsController = require('./smartThingsController');

const TEMP_HIGH = 28;
const TEMP_LOW = 18;
const RAPID_TEMP_CHANGE = 3;
const DEFAULT_IOT_USER_ID = process.env.IOT_DEFAULT_USER_ID || 'lkms1472';

/**
 * 위험 상태 검사 + Socket 알림
 */
const checkDangerCondition = async (
    userId,
    temperature,
    io
) => {

    try {

        // 이전 데이터 조회
        const latest = await TemperHumility.findOne({
            userId
        }).sort({
            timestamp: -1
        });

        /**
         * 고온 감지
         */
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

        /**
         * 저온 감지
         */
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

        /**
         * 급격한 온도 변화 감지
         */
        if (latest) {

            const diff = temperature - latest.temperature;

            // 급상승
            if (diff >= RAPID_TEMP_CHANGE) {

                console.log(
                    `[온도 급상승] ${latest.temperature} → ${temperature}`
                );

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

            // 급하락
            if (diff <= -RAPID_TEMP_CHANGE) {

                console.log(
                    `[온도 급하락] ${latest.temperature} → ${temperature}`
                );

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

        console.error(
            '[위험 상태 검사 실패]',
            error.message
        );
    }
};

exports.saveSensorReading = async ({
    userId,
    temperature,
    humidity,
    io
}) => {
    if (
        temperature === undefined ||
        humidity === undefined ||
        !userId
    ) {
        throw new Error('temperature, humidity, and userId are required.');
    }

    const latestSleep = await TemperHumility.findOne({
        userId
    }).sort({
        timestamp: -1
    });

    const sensorData = new TemperHumility({
        userId,
        temperature,
        humidity,
        sleepScore: latestSleep?.sleepScore || null,
        timestamp: new Date()
    });

    await sensorData.save();

    console.log(
        `[DB 저장 완료] userId=${userId}, temp=${temperature}, hum=${humidity}`
    );

    await checkDangerCondition(
        userId,
        temperature,
        io
    );

    try {
        const automationActions = await smartThingsController.applySensorAutomation({
            userId,
            temperature,
            humidity
        });

        if (automationActions.length > 0) {
            console.log('[ST_AUTOMATION]', automationActions);
        }
    } catch (automationError) {
        console.error('[ST_AUTOMATION_ERROR]', automationError.message);
    }

    return sensorData;
};

exports.getHistoryData = async (req, res) => {

    const { userId } = req.query;

    try {

        const query = userId
            ? { userId }
            : {};

        const history = await TemperHumility.find(query)
            .sort({ timestamp: -1 })
            .limit(50)
            .lean();

        const formatted = history.reverse().map(item => ({
            time: item.timestamp,
            temperature: item.temperature,
            humidity: item.humidity,
            sleepScore: item.sleepScore
        }));

        res.status(200).json(formatted);

    } catch (error) {

        res.status(500).json({
            message: "Failed to load sensor history.",
            error: error.message
        });
    }
};

/**
 * 1. IoT → Node.js 데이터 수신
 */
exports.receiveSensorData = async (
    req,
    res
) => {

    try {
        const io = req.app?.get('io');

        const {
            temperature,
            humidity,
            userId
        } = req.body;

        if (
            temperature === undefined ||
            humidity === undefined ||
            !userId
        ) {

            return res.status(400).json({
                message: '온도, 습도 및 사용자 ID 정보가 필요합니다.'
            });
        }

        /**
         * 수면 점수는 기존 값 유지
         */
        const latestSleep = await TemperHumility.findOne({
            userId
        }).sort({
            timestamp: -1
        });

        /**
         * MongoDB 저장
         */
        const sensorData = new TemperHumility({
            userId,
            temperature,
            humidity,
            sleepScore: latestSleep?.sleepScore || null,
            timestamp: new Date()
        });

        await sensorData.save();

        console.log(
            `[DB 저장 완료] userId=${userId}, temp=${temperature}, hum=${humidity}`
        );

        /**
         * 위험 상태 검사
         */
        await checkDangerCondition(
            userId,
            temperature,
            io
        );

        try {
            const automationActions = await smartThingsController.applySensorAutomation({
                userId,
                temperature,
                humidity
            });

            if (automationActions.length > 0) {
                console.log('[ST_AUTOMATION]', automationActions);
            }
        } catch (automationError) {
            console.error('[ST_AUTOMATION_ERROR]', automationError.message);
        }

        res.status(200).json({
            success: true,
            message: '센서 데이터 저장 완료',
            data: sensorData
        });

    } catch (error) {

        console.error(
            '[센서 저장 실패]',
            error.message
        );

        res.status(500).json({
            success: false,
            message: '센서 데이터 저장 실패',
            error: error.message
        });
    }
};

/**
 * 2. Android → 최신 데이터 조회
 */
exports.getLatestData = async (req, res) => {

    const { userId } = req.query;

    try {

        const query = userId
            ? { userId }
            : {};

        const latestData = await TemperHumility.findOne(query)
            .sort({ timestamp: -1 });

        if (!latestData) {

            return res.status(404).json({
                message: "저장된 데이터가 없습니다."
            });
        }

        res.status(200).json(latestData);

    } catch (error) {

        res.status(500).json({
            message: "데이터 조회 중 오류 발생",
            error: error.message
        });
    }
};

/**
 * 3. Android → 수면점수 변화 그래프용 데이터
 */
exports.getSleepScoreHistory = async (req, res) => {

    const { userId } = req.query;

    if (!userId) {

        return res.status(400).json({
            message: "userId 필요"
        });
    }

    try {

        const history = await TemperHumility.find({
            userId,
            sleepScore: { $ne: null }
        })
        .sort({ timestamp: 1 })
        .select("sleepScore timestamp");

        const formatted = history.map(item => ({
            score: item.sleepScore,
            time: item.timestamp
        }));

        res.status(200).json(formatted);

    } catch (error) {

        res.status(500).json({
            message: "수면점수 조회 실패",
            error: error.message
        });
    }
};
