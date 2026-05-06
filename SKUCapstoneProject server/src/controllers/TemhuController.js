const TemperHumility = require('../models/TemperHumility');

// 메모리에 센서 데이터를 임시 저장할 배열 (버퍼)
let sensorBuffer = [];

/**
 * 1. 센서에서 데이터를 받아 버퍼에 넣는 함수 (IoT -> Node)
 */
exports.receiveSensorData = (req, res) => {
    // 앱과 통일하기 위해 userId로 받음
    const { temperature, humidity, userId } = req.body;

    if (temperature === undefined || humidity === undefined || !userId) {
        return res.status(400).json({ message: '온도, 습도 및 사용자 ID 정보가 필요합니다.' });
    }

    sensorBuffer.push({
        userID: userId, // DB 필드명인 userID에 저장
        temperature,
        humidity,
        timestamp: new Date()
    });

    res.status(200).json({ message: '데이터가 버퍼에 저장되었습니다.' });
};

/**
 * 2. 안드로이드 앱에서 최신 데이터를 가져가는 함수 (Node -> Android)
 */
exports.getLatestData = async (req, res) => {
    // 앱이 보낸 ?userId=... 값을 가져옴
    const { userId } = req.query;

    try {
        // DB 필드명 userID와 앱에서 온 userId를 매칭
        const query = userId ? { userId: userId } : {};
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
 * 3. 10분 단위로 그룹화된 온습도 이력을 반환하는 함수 (Node -> Android)
 */
exports.getHistoryData = async (req, res) => {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({ message: "사용자 ID가 필요합니다." });
    }

    try {
        const startTime = new Date(Date.now() - 12 * 60 * 60 * 1000);

        const history = await TemperHumility.aggregate([
            {
                $match: {
                    userID: userId, // 💡 DB 필드명 userID 사용
                    timestamp: { $gte: startTime }
                }
            },
            {
                $group: {
                    _id: {
                        timestamp: {
                            $subtract: [
                                { $toLong: "$timestamp" },
                                { $mod: [{ $toLong: "$timestamp" }, 10 * 60 * 1000] }
                            ]
                        }
                    },
                    avgTemp: { $avg: "$temperature" },
                    avgHum: { $avg: "$humidity" }
                }
            },
            { $sort: { "_id.timestamp": 1 } }
        ]);

        const formattedData = history.map(item => ({
            time: new Date(item._id.timestamp),
            temperature: Math.round(item.avgTemp * 10) / 10,
            humidity: Math.round(item.avgHum * 10) / 10
        }));

        res.status(200).json(formattedData);
    } catch (error) {
        res.status(500).json({ message: "이력 조회 중 오류 발생", error: error.message });
    }
};

/**
 * 4. 60초마다 버퍼의 데이터를 DB에 일괄 저장
 */
exports.saveBufferToDB = async () => {
    if (sensorBuffer.length === 0) return;

    const dataToInsert = [...sensorBuffer];
    sensorBuffer = [];

    try {
        await TemperHumility.insertMany(dataToInsert);
        console.log(`[DB 적재 완료] ${dataToInsert.length}개의 데이터 저장됨.`);
    } catch (error) {
        console.error('[DB 적재 실패]', error);
        sensorBuffer = [...dataToInsert, ...sensorBuffer]; 
    }
};