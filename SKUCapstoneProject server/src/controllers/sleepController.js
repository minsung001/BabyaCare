const { MLR } = require('ml-regression');
const Sleep = require('../models/Sleep');
const aiModel = require('../models/ai'); // ai.js 모듈 호출

let sleepModel = null;

// [공통] 수면 점수 계산 수식
const calcScore = (temp, humidity, noise, isCrying) => {
    let score = 100;
    score -= 6 * Math.abs(temp - 23);
    score -= 0.5 * Math.abs(humidity - 50);
    score -= 1 * Math.abs(noise - 40);
    score -= 45 * (isCrying ? 1 : 0);
    return Math.max(0, Math.min(100, Math.round(score)));
};

/**
 * [추가 기능 1] 1시간 단위 집계 및 점수 재저장
 * 지난 1시간 동안 쌓인 실시간 데이터들을 평균 내서 '요약 레코드'로 다시 저장합니다.
 */
exports.processHourlyBatch = async () => {
    try {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        
        // 1시간 동안의 데이터 평균 집계
        const stats = await Sleep.aggregate([
            { $match: { createdAt: { $gte: oneHourAgo } } },
            { $group: {
                _id: null,
                avgT: { $avg: "$temp" },
                avgH: { $avg: "$humidity" },
                avgN: { $avg: "$noise" },
                cryingCount: { $sum: "$isCrying" }
            }}
        ]);

        if (stats.length === 0) return console.log("집계할 데이터가 없습니다.");

        const { avgT, avgH, avgN, cryingCount } = stats[0];
        const hourlyScore = calcScore(avgT, avgH, avgN, cryingCount > 0);

        // 기존 Sleep 모델에 요약본 저장 (이 값들이 8시 리포트의 핵심이 됩니다)
        const summaryRecord = new Sleep({
            temp: avgT.toFixed(1),
            humidity: avgH.toFixed(1),
            noise: avgN.toFixed(1),
            isCrying: cryingCount > 0 ? 1 : 0,
            actualScore: hourlyScore,
            createdAt: new Date()
        });

        await summaryRecord.save();
        console.log(`[Batch] ${new Date().getHours()}시 집계 완료: ${hourlyScore}점`);
    } catch (err) {
        console.error("Hourly Batch 에러:", err);
    }
};

/**
 * [추가 기능 2] 아침 8시 GPT 상황 요약 생성
 * 어젯밤(최근 12시간) 데이터를 모아 GPT에게 상황 설명을 요청합니다.
 */
exports.generate8AMReport = async (req, res) => {
    try {
        const last12h = new Date(Date.now() - 12 * 60 * 60 * 1000);
        const nightData = await Sleep.find({ createdAt: { $gte: last12h } });

        if (nightData.length === 0) {
            return res ? res.status(404).json({ message: '데이터가 없습니다.' }) : null;
        }

        // GPT에게 전달할 데이터 가공
        const avgScore = (nightData.reduce((a, b) => a + (b.actualScore || 0), 0) / nightData.length).toFixed(1);
        const cryingTotal = nightData.filter(d => d.isCrying === 1).length;

        const reportData = {
            reportType: "아침 수면 종합 리포트",
            avgScore,
            cryingTotal,
            dataCount: nightData.length
        };

        // ai.js의 generateAiReport 호출 (민성 님의 aiController 로직)
        const gptSummary = await aiModel.generateAiReport(reportData);

        if (res) {
            res.json({ success: true, report: gptSummary });
        }
        console.log("🌅 8시 GPT 리포트 생성 완료");
        return gptSummary;

    } catch (err) {
        console.error("8시 리포트 생성 에러:", err);
        if (res) res.status(500).json({ error: err.message });
    }
};

// [기존 로직 유지] 분석 결과 기록 (Flask 연동)
exports.recordAnalysisResult = async (req, res) => {
    try {
        const { temp, humidity, noise, isCrying } = req.body;
        const score = calcScore(temp, humidity, noise, isCrying);
        const record = new Sleep({
            temp, humidity, noise, isCrying: isCrying ? 1 : 0,
            actualScore: score, createdAt: new Date()
        });
        await record.save();
        res.json({ success: true, score, data: record });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// [기존 로직 유지] 모델 학습 및 조회
exports.seedMLData = async (req, res) => { /* 기존 코드 */ };
const trainSleepModel = async () => { /* 기존 코드 */ };
exports.getSleepAnalysis = async (req, res) => { /* 기존 코드 */ };