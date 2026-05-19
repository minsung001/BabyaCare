const mongoose = require('mongoose');

// src/config/db.js (또는 connectDB가 정의된 파일)
const connectDB = async () => {
    try {
        const uri = process.env.MONGODB_URI;
        // 디버깅을 위해 URI의 형식이 맞는지 출력 (비밀번호는 마스킹)
        console.log("입력된 URI:", uri.replace(/:([^@]+)@/, ":****@")); 

        const conn = await mongoose.connect(uri);
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        // .message 대신 error 전체를 출력하여 스택 트레이스 확인
        console.error("❌ 상세 에러 로그:");
        console.error(error); 
        process.exit(1);
    }
};

module.exports = { connectDB };