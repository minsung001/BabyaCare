const OpenAI = require("openai");
const AiReport = require("../models/ai");
const Sleep = require("../models/Sleep");

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// [공통] GPT 호출 함수
const generateAiReport = async (data) => {
    const prompt = `
### [역할 정의]
너는 신생아 수면 환경 데이터를 분석하고, 보호자가 이해하기 쉬운 리포트를 작성하는 전문가다.

### [지시 사항]
1. 제공된 [입력 데이터]를 분석하여 [출력 양식]의 구조에 맞춰 리포트를 작성한다.
2. 단순 수치 나열이 아니라 데이터를 종합적으로 해석하여 '부모님의 마음'을 고려해 다정하게 설명한다.
3. 의료적 진단이 아닌 환경 개선을 위한 조언 중심으로 작성한다.
4. 문장은 자연스러운 한국어로 작성한다.

### [출력 양식]
[기본 정보]
리포트 유형: ${data.reportType}
분석 기간: ${data.periodStart} ~ ${data.periodEnd}

[전체 요약]
(어젯밤 수면의 질을 총평하는 문단)

[환경 상태 분석]
(온도, 습도, 소음 데이터를 기반으로 한 환경 평가)

[수면 상태 분석]
(수면 점수 및 분포를 기반으로 한 분석)

[이상 징후 및 권장 행동]
(특이사항 요약 및 오늘 밤 개선할 점 제안)

### [입력 데이터 (통계 요약)]
${JSON.stringify(data, null, 2)}
`;

    const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7
    });

    return response.choices[0].message.content;
};

// [아침 8시 자동] 보고서 생성 및 DB 저장
exports.generateDailyReport = async () => {
    try {
        const now = new Date();
        const last12h = new Date(Date.now() - 12 * 60 * 60 * 1000);

        // ✅ 오늘 날짜 보고서 중복 생성 방지
        const today = now.toISOString().slice(0, 10);
        const existing = await AiReport.findOne({
            reportType: "아침 수면 종합 리포트",
            createdAt: { $gte: new Date(today) }
        });
        if (existing) {
            return console.log("오늘 보고서 이미 존재함 → 생성 건너뜀");
        }

        const nightData = await Sleep.find({ createdAt: { $gte: last12h } });

        if (nightData.length === 0) {
            return console.log("보고서 생성할 데이터 없음");
        }

        const avgTemp = parseFloat((nightData.reduce((a, b) => a + b.temp, 0) / nightData.length).toFixed(1));
        const avgHumidity = parseFloat((nightData.reduce((a, b) => a + b.humidity, 0) / nightData.length).toFixed(1));
        const avgNoise = parseFloat((nightData.reduce((a, b) => a + b.noise, 0) / nightData.length).toFixed(1));
        const avgScore = parseFloat((nightData.reduce((a, b) => a + (b.actualScore || 0), 0) / nightData.length).toFixed(1));
        const cryingCount = nightData.filter(d => d.isCrying === 1).length;

        const periodStart = last12h.toISOString().slice(0, 16).replace('T', ' ');
        const periodEnd = now.toISOString().slice(0, 16).replace('T', ' ');

        const data = {
            reportType: "아침 수면 종합 리포트",
            periodStart,
            periodEnd,
            avgTemp,
            avgHumidity,
            avgNoise,
            avgScore,
            cryingCount,
            dataCount: nightData.length
        };

        const reportText = await generateAiReport(data);

        const report = new AiReport({
            ...data,
            reportText
        });
        await report.save();

        console.log("🌅 아침 8시 AI 보고서 생성 완료");
        return report;

    } catch (err) {
        console.error("generateDailyReport 에러:", err);
    }
};

// [안드로이드 요청] 최신 보고서 조회
exports.getLatestReport = async (req, res) => {
    try {
        const report = await AiReport.findOne().sort({ createdAt: -1 });

        if (!report) {
            return res.status(404).json({
                success: false,
                message: "아직 생성된 보고서가 없습니다."
            });
        }

        res.status(200).json({
            success: true,
            data: report
        });

    } catch (err) {
        console.error("getLatestReport 에러:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// [안드로이드 요청] 수동으로 보고서 생성 요청
exports.createReport = async (req, res) => {
    try {
        const report = await exports.generateDailyReport();

        if (!report) {
            return res.status(404).json({
                success: false,
                message: "보고서 생성할 데이터가 없습니다."
            });
        }

        res.status(200).json({
            success: true,
            data: report
        });

    } catch (err) {
        console.error("createReport 에러:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};