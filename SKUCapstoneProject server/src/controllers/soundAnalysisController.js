/**
 * soundAnalysisController.js
 * 울음 분석을 Flask 서버에 요청합니다
 */

const axios = require('axios');
const temhuController = require('./TemhuController');

class SoundAnalysisController {
  constructor() {
    this.flaskServerUrl = process.env.FLASK_SERVER_URL || 'http://127.0.0.1:5000';
    this.analysisResults = [];
    this.analysisHistory = [];
    this.audioBuffer = [];
    this.audioFlag = 0;
    this.silentCount = 0;
    this.notCryingCount = 0;
    this.isAnalyzing = false;
    this.isRunning = false;
    this.intervalId = null;
    this.app = null; // ✅ server.js에서 app 주입받을 변수
  }

  // ✅ server.js에서 app 주입 (io 접근용)
  setApp(app) {
    this.app = app;
  }

  onAudio(audioChunk) {
    const samples = new Float32Array(audioChunk.buffer);
    this.audioBuffer.push(...samples);
    if (this.audioBuffer.length > 96000) {
      this.audioBuffer.splice(0, this.audioBuffer.length - 96000);
    }
  }

  calculateDb(samples) {
    const rms = Math.sqrt(samples.reduce((s, x) => s + x * x, 0) / samples.length);
    if (rms < 1e-10) return -100;
    return 20 * Math.log10(rms);
  }

  async startAudioAnalysis(req, res) {
    try {
      if (this.isRunning) {
        return res.status(400).json({ message: '이미 실행 중' });
      }
      this.startLoop();
      res.json({ success: true, message: '음성 분석 시작' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async stopAudioAnalysis(req, res) {
    try {
      this.isRunning = false;

      if (this.intervalId !== null) {
        clearTimeout(this.intervalId);
        this.intervalId = null;
      }

      this.audioFlag = 0;
      this.silentCount = 0;
      this.notCryingCount = 0;

      res.json({ success: true, message: '음성 분석 중지' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  startLoop() {
    this.isRunning = true;

    const loop = async () => {
      if (!this.isRunning) return;

      if (this.audioBuffer.length > 0) {
        const samples = new Float32Array(this.audioBuffer);
        const db = this.calculateDb(samples);

        if (db > -40) {
          this.audioFlag = 1;
          this.silentCount = 0;
        } else {
          this.silentCount++;
        }

        if (this.audioFlag === 1 && !this.isAnalyzing) {
          await this.requestAudioFlaskAnalysis();
        }

        if (this.silentCount >= 10 && this.notCryingCount >= 10) {
          console.log('[SoundAnalysisController] 조용해짐. audioFlag 0으로 변경');
          this.audioFlag = 0;
          this.silentCount = 0;
          this.notCryingCount = 0;
        }
      }

      if (this.isRunning) {
        this.intervalId = setTimeout(loop, 1000);
      }
    };

    this.intervalId = setTimeout(loop, 0);
  }

  async requestAudioFlaskAnalysis() {
    try {
      this.isAnalyzing = true;

      const buffer = Buffer.from(new Float32Array(this.audioBuffer).buffer);

      const response = await axios.post(
        `${this.flaskServerUrl}/api/audio/analyze`,
        buffer,
        {
          timeout: 60000,
          headers: { 'Content-Type': 'application/octet-stream' }
        }
      );

      const analysisResult = {
        timestamp: Date.now(),
        result: response.data,
        receivedAt: Date.now(),
        status: 'success'
      };

      this.analysisResults.push(analysisResult);
      this.analysisHistory.push(analysisResult);

      if (this.analysisResults.length > 50) {
        this.analysisResults.shift();
      }

      if (!response.data.data.cry_detected) {
        this.notCryingCount++;
      } else {
        this.notCryingCount = 0;
      }

      // ✅ 울음 감지 시 DB 저장 + 소켓 알림
      if (response.data.data.cry_detected === true) {
        console.log('[SoundAnalysisController] 울음 감지됨!');

        const io = this.app ? this.app.get('io') : null;
        const userId = 'lkms1472'; // ⚠️ TODO: 실제 userId 관리 방식에 맞게 수정 필요
        const cryProbability = response.data.data.cry_probability ?? null;

        await temhuController.saveCryEvent(userId, cryProbability, io);
      }

    } catch (error) {
      const errorResult = {
        timestamp: Date.now(),
        error: error.message,
        status: 'failed'
      };
      this.analysisHistory.push(errorResult);

    } finally {
      this.isAnalyzing = false;
    }
  }

  getAnalysisResults(req, res) {
    try {
      res.json({
        success: true,
        count: this.analysisResults.length,
        results: this.analysisResults
      });
    } catch (error) {
      console.error('[SoundAnalysisController] 결과 조회 실패:', error.message);
      res.status(500).json({
        success: false,
        message: '결과 조회 실패',
        error: error.message
      });
    }
  }

  getAnalysisHistory(req, res) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit) : 20;
      const history = this.analysisHistory.slice(-limit);

      res.json({
        success: true,
        count: history.length,
        total: this.analysisHistory.length,
        history: history
      });
    } catch (error) {
      console.error('[SoundAnalysisController] 히스토리 조회 실패:', error.message);
      res.status(500).json({
        success: false,
        message: '히스토리 조회 실패',
        error: error.message
      });
    }
  }

  getResultsByDate(req, res) {
    try {
      const { date } = req.params;
      const targetDate = new Date(date).getTime();
      const dayInMs = 24 * 60 * 60 * 1000;

      const filtered = this.analysisHistory.filter(item => {
        if (!item.timestamp) return false;
        return item.timestamp >= targetDate && item.timestamp < targetDate + dayInMs;
      });

      res.json({
        success: true,
        date: date,
        count: filtered.length,
        results: filtered
      });
    } catch (error) {
      console.error('[SoundAnalysisController] 날짜별 조회 실패:', error.message);
      res.status(500).json({
        success: false,
        message: '날짜별 조회 실패',
        error: error.message
      });
    }
  }
}

module.exports = new SoundAnalysisController();