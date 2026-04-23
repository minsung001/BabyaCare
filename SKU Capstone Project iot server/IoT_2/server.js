const express = require('express');

const http = require('http');

const WebSocket = require('ws');

const dgram = require('dgram'); // UDP 통신을 위한 기본 모듈



const app = express();

const server = http.createServer(app);

const wss = new WebSocket.Server({ server });

const { spawn } = require('child_process');
/*
// 서버 시작과 동시에 파이썬 프로세스 실행
const pythonAnalysis = spawn('python', ['decibel.py']);

// 파이썬에서 print() 하는 내용을 노드 터미널에 표시
pythonAnalysis.stdout.on('data', (data) => {
    console.log(`[Python 분석기]: ${data}`);
});

// 파이썬 에러 발생 시 표시
pythonAnalysis.stderr.on('data', (data) => {
    console.error(`[Python 에러]: ${data}`);
});
*/
// public 폴더 안의 HTML 파일을 웹에 띄워줌

app.use(express.static('public'));



// 1. 브라우저와 웹소켓 연결

wss.on('connection', (ws) => {

    console.log('[서버] 웹 브라우저가 화면에 접속했습니다.');

    ws.on('close', () => console.log('[서버] 웹 브라우저 접속이 끊겼습니다.'));

});



// 2. 라즈베리파이 UDP 데이터 수신부

const udpServer = dgram.createSocket('udp4');



udpServer.on('message', (msg) => {

    // 라즈베리파이에서 영상 조각(msg)이 도착할 때마다

    // 현재 접속해 있는 모든 웹 브라우저로 지연 없이 바로 쏴줌 (브로드캐스트)

    wss.clients.forEach((client) => {

        if (client.readyState === WebSocket.OPEN) {

            client.send(msg, { binary: true }); // 바이너리 강제 설정

        }

    });
    udpServer.send(msg, 0, msg.length, 9999, '127.0.0.1');

});

// 8888번 포트에서 대기
udpServer.bind(8888, () => {

    console.log(' UDP 수신 대기 중... (포트: 8888)');

});

const resultUdp = dgram.createSocket('udp4');

resultUdp.on('message', (msg) => {
    const message = msg.toString().trim();
    
    // [핵심] 영상 전송 중인 wss.clients를 건드리지 않고, 
    // 오직 '알람 전용' 메시지 타입으로만 쏩니다.
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            // 영상 데이터 전송(binary)과 겹치지 않게 
            // 'isAlarm' 같은 플래그를 붙여서 아주 짧게 보냅니다.
            console.log(`ALARM:${message}`); 
        }
    });
});
/*
resultUdp.on('message', (msg) => {
    const message = msg.toString();
    console.log(`[파이썬 분석 결과]: ${message}`);

    // 웹 브라우저로 "아기가 울어요!"라고 메시지 전송
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'alert', value: message }));
        }
    });
});
*/
resultUdp.bind(3001, () => {
    console.log('📢 분석 결과 수신용 3001 포트 대기 중...');
});



// 3000번 포트로 웹 서버 열기

server.listen(3000, () => {

    console.log(' 웹 서버 시작 완료 -> http://localhost:3000');

}); 