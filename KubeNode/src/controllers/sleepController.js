const { MLR } = require('ml-regression');
const Sleep = require('../models/Sleep');
const TemperHumility = require('../models/TemperHumility');
const aiController = require('./aiController');

let sleepModel = null;

// ✅ 수면점수 계산 함수 (TemhuController에서 호출)
const calcScore = (temp, humidity, noise, isCrying) => {
    let score = 100;
    console.log(`[calcScore] temp=${temp}, humidity=${humidity}, noise=${noise}, isCrying=${isCrying}`);
    score -= 6 * Math.abs((temp ?? 23) - 23);
    score -= 0.5 * Math.abs((humidity ?? 50) - 50);
    score -= 1 * Math.max(0, ((noise ?? -80) + 80) - 40);
    score -= 45 * (isCrying ? 1 : 0);
    return Math.max(0, Math.min(100, Math.round(score)));
};

exports.calcScore = calcScore;

exports.generateDailyComprehensiveReport = async () => {
    console.log("🌅 8시 GPT 리포트 생성 시작...");
    await aiController.generateDailyReport();
};

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
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.processHourlyBatch = async (userId) => {
    console.log("[Batch] 현재는 TemhuController에서 실시간 저장 중");
};

exports.updateSleepScoreForUser = async (userId) => {
    console.log("[sleepScore] 현재는 TemhuController에서 실시간 저장 중");
};

exports.seedMLData = async (req, res) => { /* 기존 코드 */ };
const trainSleepModel = async () => { /* 기존 코드 */ };
exports.getSleepAnalysis = async (req, res) => { /* 기존 코드 */ };