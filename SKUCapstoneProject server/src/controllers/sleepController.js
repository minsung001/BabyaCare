const { MLR } = require('ml-regression');
const Sleep = require('../models/Sleep');

// 전역 변수로 모델 관리
let sleepModel = null;

// [Step 1] 센서 및 AI 분석값 기반 가공 데이터 생성 (Seed Data)
exports.seedMLData = async (req, res) => {
    try {
        const dummyData = [];
        for (let i = 0; i < 200; i++) {
            // 1. 물리적 센서 데이터 생성
            const temp = 18 + Math.random() * 12;      // 18~30도
            const noise = 20 + Math.random() * 50;     // 20~70dB
            const humidity = 30 + Math.random() * 50;  // 30~80%
            
            // 2. AI 울음 감지 데이터 (팀원 로직 반영)
            const isCrying = Math.random() > 0.85 ? 1 : 0;

            // [가중치 재설정] 수면 시간 제외, 환경 및 상태 기반 100점 만점
            let score = 100;
            
            // ① 온도 가중치 (중요도: 상): 적정 온도 23도 기준, 1도당 6점 감점
            score -= Math.abs(temp - 23) * 6; 
            
            // ② 울음 가중치 (중요도: 최상): 울음 발생 시 즉시 45점 감점
            if (isCrying === 1) {
                score -= 45; 
            } else {
                // ③ 일반 소음 가중치 (중요도: 중): 50dB 초과 시 감점
                score -= (noise > 50 ? (noise - 50) * 2 : 0);
            }

            // ④ 습도 가중치 (중요도: 하): 적정 습도 50% 기준, 1%당 0.5점 감점
            score -= Math.abs(humidity - 50) * 0.5;

            dummyData.push({
                temp, 
                noise, 
                humidity, 
                isCrying, 
                actualScore: Math.max(0, Math.min(100, score)), // 0~100점 사이로 제한
                time: `${Math.floor(Math.random()*24)}:00`
            });
        }
        await Sleep.deleteMany({ actualScore: { $exists: true } });
        await Sleep.insertMany(dummyData);
        res.json({ message: "수면 시간을 제외한 환경/상태 기반 학습 데이터 생성 완료" });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// [Step 2] 모델 학습 함수 (특성 수: 4개로 조정)
const trainSleepModel = async () => {
    const data = await Sleep.find({ actualScore: { $exists: true } });
    if (data.length < 50) return null;

    // 입력 특성: [온도, 습도, 소음, 울음여부]
    const X = data.map(d => [
        d.temp, 
        d.humidity, 
        d.noise, 
        d.isCrying || 0
    ]);
    const y = data.map(d => d.actualScore);
    
    sleepModel = new MLR(X, y);
    console.log("✅ 환경 및 울음 지표 기반 수면 모델 학습 완료");
};

// [Step 3] 실시간 데이터 분석 및 예측
exports.getSleepAnalysis = async (req, res) => {
    try {
        if (!sleepModel) await trainSleepModel();

        const recentRecords = await Sleep.find().sort({ createdAt: -1 }).limit(10);
        
        const analyzed = recentRecords.map(curr => {
            let predicted = 80; 
            if (sleepModel) {
                // 예측 시에도 수면 시간 제외
                predicted = sleepModel.predict([
                    curr.temp, 
                    curr.humidity || 50, 
                    curr.noise || 30,
                    curr.isCrying || 0
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

    if (last24h.length === 0) return res.status(404).json({ message: "분석할 데이터가 없습니다." });

    const reportData = {
        avgTemp: (last24h.reduce((a, b) => a + b.temp, 0) / last24h.length).toFixed(1),
        avgHumidity: (last24h.reduce((a, b) => a + b.humidity, 0) / last24h.length).toFixed(1),
        maxNoise: Math.max(...last24h.map(d => d.noise)),
        cryCount: last24h.filter(d => d.isCrying === 1).length
    };

    res.json({
        prompt: `소아과 전문가 관점에서 아기의 수면 환경 리포트를 작성해 주세요. 
        분석 데이터: 평균 온도 ${reportData.avgTemp}도, 평균 습도 ${reportData.avgHumidity}%, 최대 소음 ${reportData.maxNoise}dB, 울음 감지 ${reportData.cryCount}회.
        환경 개선점과 수면 질에 대한 종합 의견을 주되, 전문적이면서 친절한 말투로 작성해 주세요.`,
        data: reportData
    });
};