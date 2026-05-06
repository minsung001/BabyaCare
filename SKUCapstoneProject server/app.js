require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cron = require('node-cron');
const axios = require('axios');
const path = require('path');

const { connectDB } = require('./src/db'); 
const receiver = require('./src/receiver'); 

const temhuController = require('./src/controllers/TemhuController');
const sleepController = require('./src/controllers/sleepController'); 

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.set('wss', wss);

const PORT = process.env.PORT || 3001;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use((req, res, next) => {
    console.log("==============================================");
    console.log("📥 요청 들어옴:", req.method, req.originalUrl);
    next();
});

const authRouter = require('./src/routes/authRoutes');
const policyRouter = require('./src/routes/policyRoutes');
const vaccineRouter = require('./src/routes/vaccineRoutes');
const sleepRoutes = require('./src/routes/sleepRoutes');
const smartThingsRouter = require('./src/routes/smartThingsRoutes');
const videoRoutes = require('./src/routes/videoRoutes');
const soundAnalysisRoutes = require('./src/routes/soundAnalysisRoutes');
const aiRouter = require('./src/routes/airouter');
const temhuRoutes = require('./src/routes/temhuRoutes');

app.use('/auth', authRouter);
app.use('/api/policies', policyRouter);
app.use('/api/vaccine', vaccineRouter);  // ✅ vaccines → vaccine 수정
app.use('/api/Sleep', sleepRoutes);
app.use('/api/SmartThings', smartThingsRouter);
app.use('/api/video', videoRoutes);
app.use('/api/sound-analysis', soundAnalysisRoutes);
app.use('/api/ai', aiRouter);
app.use('/api/temhu', temhuRoutes);

app.use('/stream', express.static(path.join(__dirname, 'public/stream')));

setInterval(() => {
    temhuController.saveBufferToDB(); 
}, 30000);

cron.schedule('0 0 * * * *', () => {
    console.log('⏰ [Hourly] 1시간 단위 수면 점수 집계 시작...');
    sleepController.processHourlyScore();
});

cron.schedule('0 0 8 * * *', () => {
    console.log('🌅 [Daily] 아침 8시! GPT 수면 상황 요약 생성 중...');
    sleepController.generateDailyComprehensiveReport();
});

server.listen(PORT, async () => {
    console.log('==============================================');
    try {
        await connectDB();
        console.log(`✅ MongoDB 연결 성공`);

        receiver.init(wss);
        console.log(`✅ WebSocket(Receiver) 초기화 성공`);

        axios.post(`http://localhost:${PORT}/api/video/start`).catch(() => {});
        axios.post(`http://localhost:${PORT}/api/sound-analysis/start`).catch(() => {});
        
        console.log(`🚀 서버 가동 중: http://localhost:${PORT}`);
        console.log('⏳ 배치 작업 모드(30초/1시간/8시)가 활성화되었습니다.');
    } catch (err) {
        console.error("❌ 서버 초기화 중 오류 발생:", err.message);
    }
    console.log('==============================================');
});