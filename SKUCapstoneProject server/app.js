require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { Server } = require('socket.io');
const cron = require('node-cron');
const axios = require('axios');
const path = require('path');

const { connectDB } = require('./src/db'); 
const receiver = require('./src/receiver'); 

const temhuController = require('./src/controllers/TemhuController');
const sleepController = require('./src/controllers/sleepController'); 

const app = express();
const server = http.createServer(app);

// IoT 기기 통신용 (기존 유지)
const wss = new WebSocket.Server({ server });
app.set('wss', wss);

// 안드로이드 알림 전용 socket.io
const io = new Server(server, {
  cors: { origin: '*' }
});
app.set('io', io);

io.on('connection', (socket) => {
  console.log('📱 안드로이드 연결됨:', socket.id);

  // 안드로이드에서 로그인 후 userId로 등록
  socket.on('register', (userId) => {
    socket.join(userId);
    console.log(`✅ [${userId}] 소켓 등록됨`);
  });

  socket.on('disconnect', () => {
    console.log('📱 안드로이드 연결 끊김:', socket.id);
  });
});

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
app.use('/api/vaccine', vaccineRouter);
app.use('/api/Sleep', sleepRoutes);
app.use('/api/SmartThings', smartThingsRouter);
app.use('/api/video', videoRoutes);
app.use('/api/sound-analysis', soundAnalysisRoutes);
app.use('/api/ai', aiRouter);
app.use('/api/temhu', temhuRoutes);

app.use('/stream', (req, res, next) => {
    if (req.path.endsWith('.m3u8')) {
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl')
        res.setHeader('Cache-Control', 'no-cache, no-store')
    } else if (req.path.endsWith('.ts')) {
        res.setHeader('Content-Type', 'video/mp2t')
    }
    next()
}, express.static(path.join(__dirname, 'public/stream')));

// 30초마다 온습도 버퍼 DB 저장
setInterval(() => {
    temhuController.saveBufferToDB(); 
}, 30000);

// 10분마다 수면점수 계산 → temperhumilities에 저장
cron.schedule('*/10 * * * *', () => {
    console.log('⏰ [10분] 수면 점수 계산 및 저장 시작...');
    sleepController.processHourlyBatch();
});

// 1시간마다 수면 점수 집계
cron.schedule('0 * * * *', () => {
    console.log('⏰ [Hourly] 1시간 단위 수면 점수 집계 시작...');
    sleepController.processHourlyBatch();
});

// 매일 아침 8시 AI 보고서 생성
cron.schedule('0 8 * * *', () => {
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
        console.log('⏳ 배치 작업 모드(10분/1시간/8시)가 활성화되었습니다.');
    } catch (err) {
        console.error("❌ 서버 초기화 중 오류 발생:", err.message);
    }
    console.log('==============================================');
});