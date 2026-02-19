const { MLR } = require('ml-regression');
const Sleep = require('../models/Sleep');

// 전역 변수로 모델 관리
let sleepModel = null;

// [Step 1] 논문 근거 가공 데이터 생성 (Seed Data)
exports.seedMLData = async (req, res) => {
    try {
        const dummyData = [];
        for (let i = 0; i < 200; i++) {
            // 물리적 환경 데이터 생성
            const temp = 18 + Math.random() * 12;      // 18~30도
            const noise = 20 + Math.random() * 50;     // 20~70dB
            const humidity = 30 + Math.random() * 50;  // 30~80%
            // 논문 근거 수면 시간 (만 3~5세 권장 10~12시간 반영) [cite: 115, 235]
            const sleepDuration = 7 + Math.random() * 6; // 7~13시간

            // 논문 및 이론적 배경 근거 수면 점수 산출 로직
            let score = 100;
            
            // 1. 온도: 한국 유아 적정 온도 약 23도 기준 감점 [cite: 183]
            score -= Math.abs(temp - 23) * 5; 
            // 2. 소음: 50dB 초과 시 수면 방해 요인으로 감점 [cite: 231]
            score -= (noise > 50 ? (noise - 50) * 2 : 0);
            // 3. 습도: 적정 습도 50% 기준 감점 [cite: 183]
            score -= Math.abs(humidity - 50) * 0.5;
            // 4. 수면 시간: 권장 11시간 미달 시 시간당 큰 폭 감점 [cite: 115, 219]
            if (sleepDuration < 11) {
                score -= (11 - sleepDuration) * 12; 
            }

            dummyData.push({
                temp, noise, humidity, sleepDuration,
                actualScore: Math.max(0, Math.min(100, score)),
                time: `${Math.floor(Math.random()*24)}:00`
            });
        }
        await Sleep.deleteMany({ actualScore: { $exists: true } });
        await Sleep.insertMany(dummyData);
        res.json({ message: "온도·습도·소음·수면시간 기반 학습 데이터 생성 완료" });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// [Step 2] 모델 학습 함수
const trainSleepModel = async () => {
    const data = await Sleep.find({ actualScore: { $exists: true } });
    if (data.length < 50) return null;

    // 입력 특성: [온도, 습도, 소음, 수면시간]
    const X = data.map(d => [d.temp, d.humidity, d.noise, d.sleepDuration]);
    const y = data.map(d => d.actualScore);
    
    sleepModel = new MLR(X, y);
    console.log("✅ 4대 핵심 지표 수면 모델 학습 완료");
};

// [Step 3] 실시간 데이터 분석 및 예측
exports.getSleepAnalysis = async (req, res) => {
    try {
        if (!sleepModel) await trainSleepModel();

        const recentRecords = await Sleep.find().sort({ createdAt: -1 }).limit(10);
        
        const analyzed = recentRecords.map(curr => {
            let predicted = 80; 
            if (sleepModel) {
                // 현재 센서 값과 사용자 입력 수면 시간을 기반으로 예측
                predicted = sleepModel.predict([
                    curr.temp, 
                    curr.humidity || 50, 
                    curr.noise || 30,
                    curr.userSleepDuration || 11 // 입력 없을 시 권장 시간 기본값 적용
                ]);
            }

            const score = Math.max(0, Math.min(100, Math.round(predicted)));
            return {
                ...curr._doc,
                score,
                status: score > 80 ? "쾌적" : (score > 60 ? "보통" : "주의")
            };
        });

        res.json(analyzed);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// [Step 4] GPT 리포트용 데이터 정제
exports.getReportPayload = async (req, res) => {
    const last24h = await Sleep.find({
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    const reportData = {
        avgTemp: (last24h.reduce((a, b) => a + b.temp, 0) / last24h.length).toFixed(1),
        avgHumidity: (last24h.reduce((a, b) => a + b.humidity, 0) / last24h.length).toFixed(1),
        maxNoise: Math.max(...last24h.map(d => d.noise)),
        avgSleepDuration: (last24h.reduce((a, b) => a + (b.userSleepDuration || 0), 0) / last24h.length).toFixed(1),
        totalRecords: last24h.length
    };

    res.json({
        prompt: `소아과 전문가의 관점에서 다음 수면 데이터를 분석해 주세요. 특히 온도(${reportData.avgTemp}도)와 수면 시간(${reportData.avgSleepDuration}시간)이 유아의 수면 질에 미치는 영향을 중심으로 리포트를 작성해 주세요.`,
        data: reportData
    });
};