require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cron = require('node-cron'); // ✅ 설치 필요: npm install node-cron
const axios = require('axios');
const path = require('path');

// ==========================================
// 🛠️ DB 및 핵심 컨트롤러 불러오기 (경로 수정 완료)
// ==========================================
// 이미지(image_a7c4f7.png) 구조에 맞춰 경로를 './src/...'로 수정했습니다.
const { connectDB } = require('./src/db'); 
const receiver = require('./src/receiver'); 

const temhuController = require('./src/controllers/TemhuController');
const sleepController = require('./src/controllers/sleepController'); 

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.set('wss', wss);

const PORT = process.env.PORT || 3001;

// 영상 및 분석 데이터 처리를 위한 용량 제한 확장
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ==========================================
// 📥 요청 로그 확인용 미들웨어
// ==========================================
app.use((req, res, next) => {
    console.log("==============================================");
    console.log("📥 요청 들어옴:", req.method, req.originalUrl);
    next();
});

// ==========================================
// 🚀 라우터(Router) 설정 구역
// ==========================================
const authRouter = require('./src/routes/authRoutes');
const policyRouter = require('./src/routes/policyRoutes');
const vaccineRouter = require('./src/routes/vaccineRoutes');
const sleepRoutes = require('./src/routes/sleepRoutes');
const smartThingsRouter = require('./src/routes/smartThingsRoutes');
const videoRoutes = require('./src/routes/videoRoutes');
<<<<<<< HEAD
const soundAnalysisRoutes = require('./src/routes/Soundanalysisroutes');
=======
const soundAnalysisRoutes = require('./src/routes/soundAnalysisRoutes');
>>>>>>> kgj
const aiRouter = require('./src/routes/airouter');
const temhuRoutes = require('./src/routes/temhuRoutes');

app.use('/auth', authRouter);
app.use('/api/policies', policyRouter);
app.use('/api/vaccines', vaccineRouter);
app.use('/api/Sleep', sleepRoutes);
app.use('/api/SmartThings', smartThingsRouter);
app.use('/api/video', videoRoutes);
app.use('/api/sound-analysis', soundAnalysisRoutes);
app.use('/api/ai', aiRouter);
app.use('/api/temhu', temhuRoutes);

// HLS 스트리밍 파일 서빙
app.use('/stream', express.static(path.join(__dirname, 'public/stream')));

// ==========================================
// ⚙️ 백그라운드 스케줄러 (Cron Jobs)
// ==========================================

// 1. 30초마다 온습도 데이터 버퍼를 DB에 일괄 적재
setInterval(() => {
    // Controller에 정의된 함수명에 맞춰 호출하세요 (receiveSensorData 아님)
    temhuController.saveBufferToDB(); 
}, 30000);

// 2. 매 시 정각(0분 0초): 지난 1시간 데이터 요약 및 수면 점수 산출
cron.schedule('0 0 * * * *', () => {
    console.log('⏰ [Hourly] 1시간 단위 수면 점수 집계 시작...');
    sleepController.processHourlyScore();
});

// 3. 매일 아침 8시 정각: GPT 상황 요약 리포트 생성
cron.schedule('0 0 8 * * *', () => {
    console.log('🌅 [Daily] 아침 8시! GPT 수면 상황 요약 생성 중...');
    sleepController.generateDailyComprehensiveReport();
});

// ==========================================
// 🏁 서버 실행 및 초기화 로직
// ==========================================
server.listen(PORT, async () => {
    console.log('==============================================');
    try {
        await connectDB(); // DB 연결 대기
        console.log(`✅ MongoDB 연결 성공`);

        receiver.init(wss); // WebSocket 초기화
        console.log(`✅ WebSocket(Receiver) 초기화 성공`);

        // 초기 구동 시 필요한 시작 요청
        axios.post(`http://localhost:${PORT}/api/video/start`).catch(() => {});
        axios.post(`http://localhost:${PORT}/api/sound-analysis/start`).catch(() => {});
        
        console.log(`🚀 서버 가동 중: http://localhost:${PORT}`);
        console.log('⏳ 배치 작업 모드(30초/1시간/8시)가 활성화되었습니다.');
    } catch (err) {
        console.error("❌ 서버 초기화 중 오류 발생:", err.message);
    }
    console.log('==============================================');
});