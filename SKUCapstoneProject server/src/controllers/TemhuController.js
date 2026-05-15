const TemperHumility = require('../models/TemperHumility');


const TEMP_HIGH = 28;
const TEMP_LOW = 18;
const RAPID_TEMP_CHANGE = 3;

exports.setUserId = function(userId) {
    this.userId = userId;
};


exports.setApp = function(app) {
    this.app = app;
}

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

exports.getHistoryData = exports.getSleepScoreHistory;

exports.onData = async function(data) {
    try {
        const { temperature, humidity } = data;
        const userId = this.userId;
        const io = this.app.get('io');

        if (!userId || temperature === undefined || humidity === undefined) {
            console.error('[onData] 필수 데이터 누락');
            return;
        }

        // const latestSleep = await TemperHumility.findOne({ userId }).sort({ timestamp: -1 });

        const sensorData = new TemperHumility({
            userId,
            temperature,
            humidity,
            // sleepScore: latestSleep?.sleepScore || null,
            timestamp: new Date()
        });

        await sensorData.save();
        console.log(`[MQTT 저장] userId=${userId}, temp=${temperature}, hum=${humidity}`);

        await checkDangerCondition(userId, temperature, io);

    } catch (error) {
        console.error('[onData 실패]', error.message);
    }
};