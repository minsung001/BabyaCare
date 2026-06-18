const { MLR } = require('ml-regression');
const Sleep = require('../models/Sleep');
const TemperHumility = require('../models/TemperHumility');  // ✅ 추가
const aiController = require('./aiController');

let sleepModel = null;

const calcScore = (temp, humidity, noise, isCrying) => {
    let score = 100;
    score -= 6 * Math.abs(temp - 23);
    score -= 0.5 * Math.abs(humidity - 50);
    score -= 1 * Math.abs(noise - 40);
    score -= 45 * (isCrying ? 1 : 0);
    return Math.max(0, Math.min(100, Math.round(score)));
};

exports.processHourlyBatch = async () => {
    try {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

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

        // ✅ Sleep 컬렉션에 저장
        const summaryRecord = new Sleep({
            temp: avgT.toFixed(1),
            humidity: avgH.toFixed(1),
            noise: avgN.toFixed(1),
            isCrying: cryingCount > 0 ? 1 : 0,
            actualScore: hourlyScore,
            createdAt: new Date()
        });
        await summaryRecord.save();

        // ✅ temperhumilities 최신 데이터에 sleepScore 업데이트
        await TemperHumility.findOneAndUpdate(
            {},
            { $set: { sleepScore: hourlyScore } },
            { sort: { timestamp: -1 } }
        );

        console.log(`[Batch] ${new Date().getHours()}시 집계 완료: ${hourlyScore}점 → temperhumilities 업데이트`);

    } catch (err) {
        console.error("Hourly Batch 에러:", err);
    }
};

// ✅ 수면점수 계산 후 특정 userId의 최신 temperhumilities에 저장
exports.updateSleepScoreForUser = async (userId) => {
    try {
        const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);

        const stats = await Sleep.aggregate([
            { $match: { createdAt: { $gte: tenMinAgo } } },
            { $group: {
                _id: null,
                avgT: { $avg: "$temp" },
                avgH: { $avg: "$humidity" },
                avgN: { $avg: "$noise" },
                cryingCount: { $sum: "$isCrying" }
            }}
        ]);

        if (stats.length === 0) return console.log("점수 계산할 데이터 없음");

        const { avgT, avgH, avgN, cryingCount } = stats[0];
        const score = calcScore(avgT, avgH, avgN, cryingCount > 0);

        // ✅ 해당 userId의 최신 temperhumilities에 sleepScore 저장
        await TemperHumility.findOneAndUpdate(
            { userId },
            { $set: { sleepScore: score } },
            { sort: { timestamp: -1 } }
        );

        console.log(`[sleepScore] userId: ${userId} → ${score}점 저장 완료`);
        return score;

    } catch (err) {
        console.error("updateSleepScoreForUser 에러:", err);
    }
};

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

exports.seedMLData = async (req, res) => { /* 기존 코드 */ };
const trainSleepModel = async () => { /* 기존 코드 */ };
exports.getSleepAnalysis = async (req, res) => { /* 기존 코드 */ };