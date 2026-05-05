const TemperHumility = require('../models/TemperHumility');

// 메모리에 센서 데이터를 임시 저장할 배열 (버퍼)
let sensorBuffer = [];

/**
 * 1. 센서에서 데이터를 받아 버퍼에 넣는 함수 (IoT -> Node)
 */
exports.receiveSensorData = (req, res) => {
  const { temperature, humidity } = req.body;

  if (temperature === undefined || humidity === undefined) {
    return res.status(400).json({ message: '온도와 습도 데이터가 필요합니다.' });
  }

  sensorBuffer.push({
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
  try {
    // 가장 최근 데이터 1개를 가져옴
    const latestData = await TemperHumility.findOne().sort({ timestamp: -1 });
    
    if (!latestData) {
      return res.status(404).json({ message: "저장된 데이터가 없습니다." });
    }
    
    res.status(200).json(latestData);
  } catch (error) {
    res.status(500).json({ message: "데이터 조회 중 오류 발생", error: error.message });
  }
};

/**
 * 3. 30초마다 버퍼의 데이터를 DB에 일괄 저장하는 함수 (Batch Job)
 */
exports.saveBufferToDB = async () => {
  if (sensorBuffer.length === 0) return;

  const dataToInsert = [...sensorBuffer];
  sensorBuffer = [];

  try {
    await TemperHumility.insertMany(dataToInsert);
    console.log(`[DB 적재 완료] ${dataToInsert.length}개의 온습도 데이터가 저장되었습니다.`);
  } catch (error) {
    console.error('[DB 적재 실패]', error);
    // 실패 시 유실 방지를 위해 버퍼 복구 (필요시 주석 해제)
    // sensorBuffer = [...dataToInsert, ...sensorBuffer]; 
  }
};