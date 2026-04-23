/**
 * videoController.js
 * IoT 카메라 영상 수신, Android 전송, Flask 분석 관리
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

class VideoController {
  constructor() {
    this.currentFrame = null;
    this.frameTimestamp = null;
    this.isStreaming = false;
    this.analysisInterval = 10000; // 10초
    this.analysisIntervalId = null;
    this.androidClients = new Set();
    this.iotCameraUrl = process.env.IOT_CAMERA_URL || 'http://192.168.1.100:8080/video';
    this.flaskServerUrl = process.env.FLASK_SERVER_URL || 'http://127.0.0.1:5000';
    this.analysisResults = [];
  }

  /**
   * IoT 카메라로부터 MJPEG 스트림 시작
   */
  async startIOTStream(req, res) {
    try {
      if (this.isStreaming) {
        return res.status(400).json({ message: 'IoT 스트림이 이미 실행 중입니다' });
      }

      console.log(`[VideoController] IoT 스트림 시작: ${this.iotCameraUrl}`);
      this.isStreaming = true;

      // 비동기로 스트림 시작 (백그라운드에서 실행)
      this.initializeMJPEGStream();

      res.json({
        success: true,
        message: 'IoT 스트림 시작되었습니다',
        cameraUrl: this.iotCameraUrl
      });

      // 분석 시작
      this.startFlaskAnalysis();

    } catch (error) {
      console.error('[VideoController] 스트림 시작 실패:', error.message);
      res.status(500).json({
        success: false,
        message: '스트림 시작 실패',
        error: error.message
      });
    }
  }

  /**
   * MJPEG 스트림 초기화 (내부 메서드)
   * @private
   */
  async initializeMJPEGStream() {
    try {
      const response = await axios({
        method: 'get',
        url: this.iotCameraUrl,
        responseType: 'stream',
        timeout: 0,
        headers: { 'Connection': 'keep-alive' }
      });

      const stream = response.data;
      let buffer = Buffer.alloc(0);

      stream.on('data', (chunk) => {
        buffer = Buffer.concat([buffer, chunk]);

        // MJPEG 경계선과 JPEG 프레임 찾기
        const boundaryIndex = buffer.indexOf('--boundary');
        if (boundaryIndex !== -1) {
          const jpegStart = buffer.indexOf('\xff\xd8', boundaryIndex);
          const jpegEnd = buffer.indexOf('\xff\xd9', jpegStart);

          if (jpegStart !== -1 && jpegEnd !== -1) {
            this.currentFrame = buffer.slice(jpegStart, jpegEnd + 2);
            this.frameTimestamp = Date.now();

            // Android 클라이언트들에게 프레임 전송
            this.broadcastToAndroid(this.currentFrame, this.frameTimestamp);

            buffer = buffer.slice(jpegEnd + 2);
          }
        }
      });

      stream.on('error', (error) => {
        console.error('[VideoController] 스트림 에러:', error.message);
        this.isStreaming = false;
      });

      stream.on('end', () => {
        console.log('[VideoController] 스트림 종료');
        this.isStreaming = false;
      });

    } catch (error) {
      console.error('[VideoController] MJPEG 스트림 초기화 실패:', error.message);
      this.isStreaming = false;
    }
  }

  /**
   * Android 클라이언트에게 프레임 브로드캐스트
   * @private
   */
  broadcastToAndroid(frame, timestamp) {
    if (this.androidClients.size === 0) return;

    const base64Frame = frame.toString('base64');
    const payload = {
      type: 'frame',
      timestamp: timestamp,
      data: base64Frame,
      size: frame.length
    };

    this.androidClients.forEach((ws) => {
      if (ws.readyState === 1) { // OPEN
        try {
          ws.send(JSON.stringify(payload));
        } catch (error) {
          console.error('[VideoController] Android 전송 실패:', error.message);
          this.androidClients.delete(ws);
        }
      }
    });
  }

  /**
   * 10초마다 Flask로 분석 요청 시작
   * @private
   */
  startFlaskAnalysis() {
    if (this.analysisIntervalId !== null) {
      return;
    }

    console.log('[VideoController] Flask 비디오 분석 시작 (10초 간격)');

    // 즉시 한 번 실행
    this.requestFlaskAnalysis();

    // 10초마다 실행
    this.analysisIntervalId = setInterval(() => {
      this.requestFlaskAnalysis();
    }, this.analysisInterval);
  }

  /**
   * Flask 서버로 현재 프레임 분석 요청
   * @private
   */
  async requestFlaskAnalysis() {
    try {
      if (!this.currentFrame) {
        console.warn('[VideoController] 분석할 프레임이 없습니다');
        return;
      }

      const base64Image = this.currentFrame.toString('base64');

      console.log('[VideoController] Flask 비디오 분석 요청 전송...');

      const response = await axios.post(
        `${this.flaskServerUrl}/api/analyze-video`,
        {
          image: base64Image,
          timestamp: this.frameTimestamp
        },
        {
          timeout: 30000,
          headers: { 'Content-Type': 'application/json' }
        }
      );

      const analysisResult = {
        timestamp: this.frameTimestamp,
        result: response.data,
        receivedAt: Date.now()
      };

      this.analysisResults.push(analysisResult);

      // 최근 100개만 유지
      if (this.analysisResults.length > 100) {
        this.analysisResults.shift();
      }

      console.log('[VideoController] Flask 분석 결과:', response.data);

      // Android 클라이언트에게 분석 결과 전송
      this.broadcastAnalysisResult(analysisResult);

    } catch (error) {
      console.error('[VideoController] Flask 분석 요청 실패:', error.message);
    }
  }

  /**
   * 분석 결과를 Android 클라이언트에게 전송
   * @private
   */
  broadcastAnalysisResult(result) {
    const payload = {
      type: 'analysisResult',
      data: result
    };

    this.androidClients.forEach((ws) => {
      if (ws.readyState === 1) {
        try {
          ws.send(JSON.stringify(payload));
        } catch (error) {
          console.error('[VideoController] 분석 결과 전송 실패:', error.message);
        }
      }
    });
  }

  /**
   * 현재 프레임 조회 (HTTP)
   */
  getCurrentFrame(req, res) {
    try {
      if (!this.currentFrame) {
        return res.status(404).json({ message: '현재 프레임이 없습니다' });
      }

      res.set('Content-Type', 'image/jpeg');
      res.send(this.currentFrame);
    } catch (error) {
      console.error('[VideoController] 프레임 조회 실패:', error.message);
      res.status(500).json({
        success: false,
        message: '프레임 조회 실패',
        error: error.message
      });
    }
  }

  /**
   * 스트림 중지
   */
  async stopIOTStream(req, res) {
    try {
      console.log('[VideoController] IoT 스트림 중지');
      this.isStreaming = false;

      // 분석 중지
      if (this.analysisIntervalId !== null) {
        clearInterval(this.analysisIntervalId);
        this.analysisIntervalId = null;
      }

      res.json({
        success: true,
        message: 'IoT 스트림이 중지되었습니다'
      });

    } catch (error) {
      console.error('[VideoController] 스트림 중지 실패:', error.message);
      res.status(500).json({
        success: false,
        message: '스트림 중지 실패',
        error: error.message
      });
    }
  }

  /**
   * 분석 결과 조회
   */
  getAnalysisResults(req, res) {
    try {
      res.json({
        success: true,
        count: this.analysisResults.length,
        results: this.analysisResults
      });
    } catch (error) {
      console.error('[VideoController] 분석 결과 조회 실패:', error.message);
      res.status(500).json({
        success: false,
        message: '분석 결과 조회 실패',
        error: error.message
      });
    }
  }

  /**
   * Android WebSocket 클라이언트 추가
   * @private
   */
  addAndroidClient(ws) {
    this.androidClients.add(ws);
    console.log(`[VideoController] Android 클라이언트 연결 (${this.androidClients.size}개)`);
  }

  /**
   * Android WebSocket 클라이언트 제거
   * @private
   */
  removeAndroidClient(ws) {
    this.androidClients.delete(ws);
    console.log(`[VideoController] Android 클라이언트 제거 (${this.androidClients.size}개)`);
  }

  /**
   * 스트림 상태 조회
   */
  getStreamStatus(req, res) {
    try {
      res.json({
        success: true,
        isStreaming: this.isStreaming,
        frameTimestamp: this.frameTimestamp,
        androidClientsCount: this.androidClients.size,
        analysisResultsCount: this.analysisResults.length,
        iotCameraUrl: this.iotCameraUrl,
        flaskServerUrl: this.flaskServerUrl
      });
    } catch (error) {
      console.error('[VideoController] 상태 조회 실패:', error.message);
      res.status(500).json({
        success: false,
        message: '상태 조회 실패',
        error: error.message
      });
    }
  }
}

module.exports = new VideoController();