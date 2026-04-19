require('dotenv').config();

const express = require('express');
const { connectDB } = require('./src/db'); 
const app = express();

const PORT = process.env.PORT || 3000;

// 미들웨어 설정
app.use(express.json());
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleString()}] 📢 요청 들어옴: ${req.method} ${req.url}`);
    next();
});
app.use(express.urlencoded({ extended: true }));

// [라우터 연결]
const authRouter = require('./src/routes/authRoutes');
const policyRouter = require('./src/routes/policyRoutes'); 
const vaccineRouter = require('./src/routes/vaccineRoutes'); 
const sleepRoutes = require('./src/routes/sleepRoutes'); 
// 🚀 1. SmartThings 라우터 가져오기
const smartThingsRouter = require('./src/routes/smartThingsRoutes'); 

// 기존 인증 라우터
app.use('/auth', authRouter);

// 복지 정책 라우터
app.use('/api/policies', policyRouter);

// 예방접종 스케줄 라우터
app.use('/api/vaccines', vaccineRouter);

// 애기 수면 점수 
app.use('/api/Sleep', sleepRoutes);

// 🚀 2. SmartThings 라우터 등록 (큰 길 지정)
// 이렇게 하면 안드로이드에서 /api/smartthings/register 로 요청을 보낼 수 있습니다.
app.use('/api/SmartThings', smartThingsRouter);


// 기본 접속 테스트
app.get('/', (req, res) => {
    res.send('Hello! Capstone Server is Running 🚀');
});


connectDB()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`---------------------------------------`);
            console.log(`🚀 서버가 http://localhost:${PORT} 에서 대기 중입니다.`);
            console.log(`🚀 데이터베이스 연결 성공`);
            console.log(`🚀 정책 API: http://localhost:${PORT}/api/policies`);
            console.log(`🚀 예방접종 API: http://localhost:${PORT}/api/vaccines/schedule/:userId`);
            // 🚀 3. 확인용 로그 추가
            console.log(`🚀 SmartThings API: http://localhost:${PORT}/api/smartthings/register`);
            console.log(`---------------------------------------`);
        });
    })
    .catch((err) => {
        console.error("❌ 서버 시작 실패 (DB 연결 오류):", err.message);
        process.exit(1);
    });