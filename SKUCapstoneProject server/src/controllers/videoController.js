/**
 * videoController.js
 * 기능: 
 * 1. IoT 카메라 영상 수신 (onFrame)
 * 2. Android 기기로 실시간 UDP 영상 전송 (Low Latency)
 * 3. 30초마다 Flask 서버로 10프레임 묶어서 분석 요청 (이전 요청 완료 후 타이머 시작)
 * 4. 분석 결과 Android 클라이언트(WebSocket) 브로드캐스트
 */

const axios = require('axios');
const dgram = require('dgram'); // UDP 통신용
const sharp = require('sharp'); // 이미지 리사이징 및 압축용

class VideoController {
    constructor() {
        this.currentFrame = null;
        this.frameTimestamp = null;
        this.analysisInterval = 30000; // ✅ 10초 → 30초로 변경 (서버 부하 감소)
        this.analysisIntervalId = null;
        this.isAnalyzing = false;      // ✅ 요청 중복 실행 방지 플래그
        this.androidClients = new Set(); // WebSocket 클라이언트 관리
        this.flaskServerUrl = process.env.FLASK_SERVER_URL || 'http://127.0.0.1:5000';
        this.analysisResults = [];
        this.frameBuffer = []; // 분석용 10장 버퍼

        // -----------------------------------------------------------
        // ✅ [UDP 설정] 안드로이드 실시간 스트리밍용
        // -----------------------------------------------------------
        this.udpSocket = dgram.createSocket('udp4');
        this.androidUdpIp = '192.168.0.10'; // 👈 실제 안드로이드폰 IP로 반드시 수정!
        this.androidUdpPort = 5005;        // 👈 안드로이드 수신 포트 번호
    }

    /**
     * receiver.js에서 8888포트로 들어온 영상을 프레임 단위로 받음
     * @param {Buffer} videoFrame - 1280 * 720 * 3 크기의 raw RGB 데이터
     */
    onFrame(videoFrame) {
        this.currentFrame = videoFrame;
        this.frameTimestamp = Date.now();

        // 1. 분석용 버퍼링 (최근 10장 유지)
        this.frameBuffer.push(videoFrame);
        if (this.frameBuffer.length > 10) {
            this.frameBuffer.shift();
        }

        // 2. ✅ [핵심] 안드로이드로 실시간 영상 쏴주기 (UDP)
        this.sendVideoToAndroid(videoFrame);
    }

    /**
     * 실시간 영상을 JPEG로 압축하여 안드로이드로 UDP 전송
     */
    async sendVideoToAndroid(rawFrame) {
        try {
            // raw 데이터(2.7MB)는 너무 커서 UDP 전송이 불가능하므로 압축 필수
            const compressedBuffer = await sharp(rawFrame, {
                raw: { width: 1280, height: 720, channels: 3 }
            })
            .resize(640, 360)      // 전송 효율을 위해 해상도 축소
            .jpeg({ quality: 60 })  // 용량을 줄이기 위해 품질 60으로 설정
            .toBuffer();

            // 안드로이드 기기로 전송
            this.udpSocket.send(
                compressedBuffer, 
                0, 
                compressedBuffer.length, 
                this.androidUdpPort, 
                this.androidUdpIp
            );
        } catch (error) {
            // console.error('[UDP 전송 실패]', error.message);
        }
    }

    /**
     * 분석 시작 명령 (라우터에서 호출)
     */
    async startAnalysis(req, res) {
        try {
            if (this.analysisIntervalId !== null) {
                return res.status(400).json({ message: '이미 분석이 진행 중입니다.' });
            }
            this.startFlaskAnalysis();
            res.json({ success: true, message: 'Flask 비디오 분석을 시작합니다.' });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * 분석 중지 명령
     */
    async stopAnalysis(req, res) {
        try {
            if (this.analysisIntervalId !== null) {
                clearTimeout(this.analysisIntervalId); // ✅ clearInterval → clearTimeout
                this.analysisIntervalId = null;
            }
            res.json({ success: true, message: '분석을 중지했습니다.' });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * ✅ 이전 요청이 완전히 끝난 후에만 다음 요청을 예약 (setInterval → 재귀 setTimeout)
     * - setInterval은 이전 요청이 오래 걸려도 무조건 다음 요청을 쌓아버림
     * - setTimeout 재귀 방식은 응답을 받은 후 타이머를 시작하므로 요청 중첩 없음
     */
    startFlaskAnalysis() {
        console.log('[VideoController] Flask 분석 프로세스 시작 (30초 간격, 중첩 방지)');

        const scheduleNext = async () => {
            await this.requestFlaskAnalysis();

            // 중지 명령이 들어온 경우 다음 타이머 예약 안 함
            if (this.analysisIntervalId === null) return;

            this.analysisIntervalId = setTimeout(scheduleNext, this.analysisInterval);
        };

        // 최초 1회 즉시 실행 후 재귀 예약
        this.analysisIntervalId = setTimeout(scheduleNext, 0);
    }

    /**
     * Flask 서버로 10장의 프레임을 묶어서 분석 요청
     */
    async requestFlaskAnalysis() {
        // ✅ 혹시 모를 중복 실행 방지 (2중 안전장치)
        if (this.isAnalyzing) {
            console.warn('[VideoController] 이전 분석 요청이 아직 진행 중입니다. 건너뜀.');
            return;
        }

        try {
            if (this.frameBuffer.length < 10) {
                console.warn('[VideoController] 분석에 필요한 프레임 부족 (현재: ' + this.frameBuffer.length + ')');
                return;
            }

            this.isAnalyzing = true; // ✅ 요청 시작 플래그

            // sharp를 이용해 프레임들을 JPEG(base64) 형태로 변환
            const frames = await Promise.all(
                this.frameBuffer.map(f =>
                    sharp(f, { raw: { width: 1280, height: 720, channels: 3 } })
                        .jpeg()
                        .toBuffer()
                        .then(buf => buf.toString('base64'))
                )
            );

            // Flask로 POST 요청
            const response = await axios.post(
                `${this.flaskServerUrl}/api/video/analyze`,
                { frames, timestamp: this.frameTimestamp },
                { timeout: 30000, headers: { 'Content-Type': 'application/json' } }
            );

            const analysisResult = {
                timestamp: this.frameTimestamp,
                result: response.data,
                receivedAt: Date.now()
            };

            this.analysisResults.push(analysisResult);
            if (this.analysisResults.length > 100) this.analysisResults.shift();

            // 아기 감지 시 로그 출력
            if (response.data.data?.result?.infant_detected === true) {
                console.log("🍼 [알림] 아기 감지 완료");
            }

            // Android 클라이언트에게 WebSocket으로 결과 전송
            this.broadcastAnalysisResult(analysisResult);
        } catch (error) {
            console.error('[VideoController] Flask 분석 요청 실패:', error.message);
        } finally {
            this.isAnalyzing = false; // ✅ 성공/실패 관계없이 플래그 해제
        }
    }

    /**
     * 분석 결과를 WebSocket 연결된 안드로이드 기기들에 전송
     */
    broadcastAnalysisResult(result) {
        const payload = JSON.stringify({
            type: 'analysisResult',
            data: result
        });
        this.androidClients.forEach((ws) => {
            if (ws.readyState === 1) { // OPEN 상태
                try {
                    ws.send(payload);
                } catch (error) {
                    this.androidClients.delete(ws);
                }
            }
        });
    }

    // --- 안드로이드 클라이언트 관리 및 기타 메서드 ---

    addAndroidClient(ws) {
        this.androidClients.add(ws);
        console.log(`[VideoController] Android 연결 추가 (총 ${this.androidClients.size}개)`);
    }

    removeAndroidClient(ws) {
        this.androidClients.delete(ws);
        console.log(`[VideoController] Android 연결 제거 (총 ${this.androidClients.size}개)`);
    }

    getCurrentFrame(req, res) {
        if (!this.currentFrame) return res.status(404).json({ message: '프레임 없음' });
        sharp(this.currentFrame, { raw: { width: 1280, height: 720, channels: 3 } })
            .jpeg().toBuffer().then(buf => {
                res.set('Content-Type', 'image/jpeg');
                res.send(buf);
            });
    }

    getAnalysisResults(req, res) {
        res.json({ success: true, count: this.analysisResults.length, results: this.analysisResults });
    }
}

module.exports = new VideoController();