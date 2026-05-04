const OpenAI = require("openai");

// 1. OpenAI API 클라이언트 초기화
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * AI 리포트 생성 함수
 * @param {Object} data - sleepController에서 이미 통계가 계산된 데이터 객체
 */
async function generateAiReport(data) {
  // 2. prompt 구성: 컨트롤러에서 넘겨준 통계 데이터를 프롬프트 템플릿에 주입합니다.
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
(온도, 습도, 소음, 조도 데이터를 기반으로 한 환경 평가)

[수면 상태 분석]
(수면 점수 및 쾌적/보통/주의 분포를 기반으로 한 분석)

[이상 징후 및 권장 행동]
(특이사항 요약 및 오늘 밤 개선할 점 제안)

### [입력 데이터 (통계 요약)]
${JSON.stringify(data, null, 2)}
`;

  try {
    // 3. OpenAI API 호출 (비용과 속도 면에서 효율적인 gpt-4o-mini 모델 사용)
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7
    });

    // 4. GPT가 생성한 텍스트 결과만 반환
    return response.choices[0].message.content;
  } catch (error) {
    console.error("OpenAI API 호출 에러:", error);
    throw new Error("AI 리포트 생성 중 통신 문제가 발생했습니다.");
  }
}

module.exports = { generateAiReport };