const Sleep = require('../models/Sleep');

exports.getAnalyzedData = async (req, res) => {
    try {
        const records = await Sleep.find().sort({ createdAt: -1 }).limit(20);
        if (records.length === 0) return res.json([]);

        // 📊 Z-score를 위한 통계 계산
        const noseValues = records.map(r => r.noseX);
        const mean = noseValues.reduce((a, b) => a + b, 0) / noseValues.length;
        const stdDev = Math.sqrt(noseValues.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / noseValues.length);

        const analyzed = records.map((curr, i) => {
            let score = 100;
            let status = "정상";
            let isEmergency = false;

            // 1. 온도 범위 (18도 미만, 30도 초과)
            if (curr.temp < 18 || curr.temp > 30) { score -= 30; status = "온도 위험"; isEmergency = true; }
            // 2. 온도 급변 (2도 이상 상승/하강)
            if (i < records.length - 1 && Math.abs(curr.temp - records[i+1].temp) >= 2) {
                score -= 20; status = "온도 급변"; isEmergency = true;
            }
            // 3. 이상 행동 (Z-score > 3)
            const z = stdDev > 0 ? Math.abs(curr.noseX - mean) / stdDev : 0;
            if (z > 3) { score -= 40; status = "이상 행동"; isEmergency = true; }

            return { time: curr.time, temp: curr.temp, score: Math.max(0, score), status, isEmergency };
        });

        res.json(analyzed.reverse());
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// 테스트 데이터 삽입용
exports.seedData = async (req, res) => {
    const dummy = [
        { time: "15:00", temp: 22.0, noseX: 100 },
        { time: "15:05", temp: 24.5, noseX: 250 }, // 위험 케이스
        { time: "15:10", temp: 24.0, noseX: 110 }
    ];
    await Sleep.deleteMany({});
    await Sleep.insertMany(dummy);
    res.json({ message: "Seed Done" });
};