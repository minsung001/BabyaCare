const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

// 서버 시작 시 SMTP 설정을 검증하는 로직 추가
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ SMTP 연결 실패:", error);
  } else {
    console.log("✅ 메일 서버가 발송 준비되었습니다.");
  }
});

async function sendVerifyMail(to, code) {
  try {
    console.log(`📧 [메일 발송 시도] To: ${to}, Code: ${code}`);
    
    const info = await transporter.sendMail({
      from: `"BabyCare" <${process.env.GMAIL_USER}>`,
      to,
      subject: "이메일 인증 코드",
      text: `인증 코드: ${code}\n\n5분 이내에 입력해주세요.`,
    });

    console.log("✅ 메일 발송 성공! MessageId:", info.messageId);
    return info;
  } catch (error) {
    console.error("❌ sendVerifyMail 함수 내부 에러:", error);
    throw error; // 에러를 상위(Controller)로 던져서 catch하게 함
  }
}

module.exports = { sendVerifyMail };