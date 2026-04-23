require('dotenv').config();

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const dgram = require('dgram');

// ✅ DB 연결만 남기고 frameStore 관련 require는 삭제했습니다.
const { connectDB } = require('./src/db');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// 핵심: 컨트롤러에서 wss를 꺼내 쓸 수 있도록 등록
app.set('wss', wss);

const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ==========================================
// 라우터 설정
// ==========================================
const authRouter = require('./src/routes/authRoutes');
const policyRouter = require('./src/routes/policyRoutes');
const vaccineRouter = require('./src/routes/vaccineRoutes');
const sleepRoutes = require('./src/routes/sleepRoutes');
const smartThingsRouter = require('./src/routes/smartThingsRoutes');
const videoRoutes = require('./src/routes/videoRoutes');
const soundAnalysisRoutes = require('./src/routes/soundAnalysisRoutes');

app.use('/auth', authRouter);
app.use('/api/policies', policyRouter);
app.use('/api/vaccines', vaccineRouter);
app.use('/api/Sleep', sleepRoutes);
app.use('/api/SmartThings', smartThingsRouter);
app.use('/api/video', videoRoutes);
app.use('/api/sound-analysis', soundAnalysisRoutes);

// ==========================================
// 📡 UDP 영상 수신 및 실시간 전송 (규격 통일)
// ==========================================
const udpServer = dgram.createSocket('udp4');

udpServer.on('message', (msg) => {
    // 1. Base64 변환
    const base64Frame = msg.toString('base64');

    // 2. JSON 패키징 (frameStore.setFrame 로직은 삭제되었습니다)
    const payload = JSON.stringify({
        type: 'udp_frame',
        timestamp: Date.now(),
        data: base64Frame,
        size: msg.length
    });

    // 3. 웹소켓 전송
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
        }
    });
});

udpServer.on('error', (err) => {
    console.error(`❌ UDP 서버 에러: ${err.message}`);
});

udpServer.bind(8888, () => {
    console.log('📡 IoT UDP 수신 대기 중 (8888)');
});

// ==========================================
// 웹소켓 이벤트
// ==========================================
wss.on('connection', (ws) => {
    console.log('🟢 안드로이드 클라이언트 연결됨');
    ws.on('close', () => console.log('🔴 안드로이드 클라이언트 연결 종료'));
});

app.get('/', (req, res) => res.send('🚀 Capstone AI Server Running'));

// ==========================================
// 🚀 DB 연결 및 서버 실행
// ==========================================
connectDB()
    .then(() => {
        server.listen(PORT, () => {
            console.log('==============================================');
            console.log(`✅ MongoDB 연결 성공`);
            console.log(`✅ UDP 스트리밍 준비 완료 (Port: 8888)`);
            console.log(`✅ 비디오/사운드 분석 라우트 준비 완료`);
            console.log('----------------------------------------------');
            console.log(`🚀 서버 실행 중: http://localhost:${PORT}`);
            console.log('==============================================');
        });
    })
    .catch((err) => {
        console.error("❌ 서버 시작 실패:", err.message);
        process.exit(1);
    });