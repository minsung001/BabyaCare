/**
 * videoController.js
 * 기능: 
 * 1. IoT 카메라 영상 수신 (onFrame)
 * 2. udp 관련 제거 >> 스트리밍 방식 변경
 * 3. 30초마다 Flask 서버로 10프레임 묶어서 분석 요청 (이전 요청 완료 후 타이머 시작)
 * 3_5. test > 열화상를 30초마다 수신, 분석 요청
 * 4. 분석 결과 Android 클라이언트(WebSocket) 브로드캐스트
 */

const axios = require('axios');
const sharp = require('sharp'); // 이미지 리사이징 및 압축용
const { VideoAnalysis } = require('../models/videoanalysis'); // DB 저장용



class VideoController {
    constructor() {
        this.currentFrame = null;
        this.frameTimestamp = null;
        this.isAnalyzing = false;      // ✅ 요청 중복 실행 방지 플래그
        this.androidClients = new Set(); // WebSocket 클라이언트 관리
        this.flaskServerUrl = process.env.FLASK_SERVER_URL || 'http://127.0.0.1:5000';
        this.analysisResults = [];
        this.frameBuffer = []; // 분석용 10장 버퍼
        this.latestThermal = null;
        this.isRunning = false;
    }

  // ✅ server.js에서 app 주입 (io 접근용)
  setApp(app) {
    this.app = app;
  }

  // ✅ receiver.init()에서 userId 주입
  setUserId(userId) {
    this.userId = userId;
    console.log(`[videoController] userId 설정됨: ${userId}`);
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
        if (this.frameBuffer.length > 1) {
            this.frameBuffer.shift();
        }

    }

    onThermal(thermalData) {
        // 열화상을 받고
        this.latestThermal = thermalData;
        
        // start 요청이 있을 때만 분석 트리거
        if (this.isRunning) {
            this.requestFlaskAnalysis();
        }
    }


    /**
     * 분석 시작 명령 (라우터에서 호출)
     */
    async startAnalysis(req, res) {
        try {
            this.isRunning = true;
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
            this.isRunning = false;
            res.json({ success: true, message: '분석을 중지했습니다.' });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
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
            if (this.frameBuffer.length < 1) {
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
                { frames, timestamp: this.frameTimestamp , thermal: this.latestThermal }, //32*24
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
                console.log("🌡️ [체온]", response.data.data?.result?.thermal);
            }

            const result = response.data.data?.result;

            // 분석 결과 DB 저장
            // 타임 스탬프는 flask에 넘기는 시점에서 찍어도 되는데 
            // 어차피 1분 안짝이라 크게 의미 없을것 같아서 일단 현재 시간
            await VideoAnalysis.create({
                timestamp: new Date(),
                infantDetected: result?.infant_detected ?? false,
                thermal: result?.thermal ?? null,
                confidence: result?.confidence ?? null,
                bbox: result?.bbox ? {
                    x1: result.bbox[0],
                    y1: result.bbox[1],
                    x2: result.bbox[2],
                    y2: result.bbox[3]
                } : null
            });


            // 웹소켓으로 보내나요? 아니면 io로 통일하나요?
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