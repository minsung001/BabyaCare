/**
 * soundAnalysisController.js
 * 울음 분석을 Flask 서버에 요청합니다
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

class SoundAnalysisController {
  constructor() {
    this.flaskServerUrl = process.env.FLASK_SERVER_URL || 'http://127.0.0.1:5000';
    this.analysisResults = [];
    this.analysisHistory = [];
  }

  /**
   * 오디오 파일로 울음 분석 요청
   */
  async analyzeSound(req, res) {
    try {
      const { audioPath, audioBase64, timestamp } = req.body;

      if (!audioPath && !audioBase64) {
        return res.status(400).json({
          success: false,
          message: '오디오 경로(audioPath) 또는 Base64 데이터(audioBase64)를 제공해주세요'
        });
      }

      let audioData = audioBase64;

      // 파일 경로가 제공된 경우 파일 읽기
      if (audioPath && !audioBase64) {
        if (!fs.existsSync(audioPath)) {
          return res.status(400).json({
            success: false,
            message: `오디오 파일을 찾을 수 없습니다: ${audioPath}`
          });
        }

        const fileBuffer = fs.readFileSync(audioPath);
        audioData = fileBuffer.toString('base64');
        console.log(`[SoundAnalysisController] 파일에서 읽은 오디오: ${audioPath}`);
      }

      console.log('[SoundAnalysisController] Flask 울음 분석 요청 전송...');

      const response = await axios.post(
        `${this.flaskServerUrl}/api/analyze-sound`,
        {
          audio: audioData,
          timestamp: timestamp || Date.now()
        },
        {
          timeout: 60000, // 60초 타임아웃
          headers: { 'Content-Type': 'application/json' }
        }
      );

      const analysisResult = {
        timestamp: timestamp || Date.now(),
        audioPath: audioPath || 'base64_data',
        result: response.data,
        receivedAt: Date.now(),
        status: 'success'
      };

      this.analysisResults.push(analysisResult);
      this.analysisHistory.push(analysisResult);

      // 최근 50개 결과만 유지
      if (this.analysisResults.length > 50) {
        this.analysisResults.shift();
      }

      console.log('[SoundAnalysisController] 울음 분석 결과:', response.data);

      res.json({
        success: true,
        message: '울음 분석 완료',
        data: analysisResult
      });

    } catch (error) {
      console.error('[SoundAnalysisController] 울음 분석 실패:', error.message);

      const errorResult = {
        timestamp: Date.now(),
        error: error.message,
        status: 'failed'
      };

      this.analysisHistory.push(errorResult);

      res.status(500).json({
        success: false,
        message: '울음 분석 요청 실패',
        error: error.message
      });
    }
  }

  /**
   * 실시간 오디오 스트림 분석 (WebSocket)
   * @param {WebSocket} ws - WebSocket 연결
   * @param {Buffer} audioChunk - 오디오 데이터 청크
   */
  async analyzeAudioStream(ws, audioChunk) {
    try {
      const audioBase64 = audioChunk.toString('base64');

      const response = await axios.post(
        `${this.flaskServerUrl}/api/analyze-sound-realtime`,
        {
          audio: audioBase64,
          timestamp: Date.now()
        },
        {
          timeout: 30000,
          headers: { 'Content-Type': 'application/json' }
        }
      );

      const analysisResult = {
        type: 'soundAnalysis',
        timestamp: Date.now(),
        result: response.data
      };

      // WebSocket으로 결과 전송
      if (ws.readyState === 1) { // OPEN
        ws.send(JSON.stringify(analysisResult));
      }

      return analysisResult;

    } catch (error) {
      console.error('[SoundAnalysisController] 실시간 울음 분석 실패:', error.message);
      return null;
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
      console.error('[SoundAnalysisController] 결과 조회 실패:', error.message);
      res.status(500).json({
        success: false,
        message: '결과 조회 실패',
        error: error.message
      });
    }
  }

  /**
   * 분석 히스토리 조회
   */
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

  /**
   * 배치 분석 (여러 오디오 파일)
   */
  async analyzeBatch(req, res) {
    try {
      const { audioFiles } = req.body;

      if (!Array.isArray(audioFiles) || audioFiles.length === 0) {
        return res.status(400).json({
          success: false,
          message: '오디오 파일 배열을 제공해주세요'
        });
      }

      console.log(`[SoundAnalysisController] 배치 분석 시작 (${audioFiles.length}개 파일)`);

      const results = [];

      for (const audioFile of audioFiles) {
        try {
          let audioData = audioFile.audioBase64;

          // 파일 경로가 제공된 경우
          if (audioFile.audioPath && !audioFile.audioBase64) {
            if (fs.existsSync(audioFile.audioPath)) {
              const fileBuffer = fs.readFileSync(audioFile.audioPath);
              audioData = fileBuffer.toString('base64');
            } else {
              results.push({
                audioPath: audioFile.audioPath,
                status: 'failed',
                error: '파일을 찾을 수 없습니다'
              });
              continue;
            }
          }

          const response = await axios.post(
            `${this.flaskServerUrl}/api/analyze-sound`,
            {
              audio: audioData,
              timestamp: audioFile.timestamp || Date.now()
            },
            { timeout: 60000 }
          );

          results.push({
            audioPath: audioFile.audioPath || 'base64_data',
            status: 'success',
            result: response.data,
            timestamp: audioFile.timestamp || Date.now()
          });

          // 요청 간 딜레이 (서버 부하 방지)
          await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error) {
          results.push({
            audioPath: audioFile.audioPath || 'base64_data',
            status: 'failed',
            error: error.message,
            timestamp: audioFile.timestamp || Date.now()
          });
        }
      }

      const batchResult = {
        timestamp: Date.now(),
        totalFiles: audioFiles.length,
        successCount: results.filter(r => r.status === 'success').length,
        failureCount: results.filter(r => r.status === 'failed').length,
        results: results
      };

      this.analysisHistory.push(batchResult);

      res.json({
        success: true,
        message: '배치 분석 완료',
        data: batchResult
      });

    } catch (error) {
      console.error('[SoundAnalysisController] 배치 분석 실패:', error.message);
      res.status(500).json({
        success: false,
        message: '배치 분석 실패',
        error: error.message
      });
    }
  }

  /**
   * 특정 날짜의 분석 결과 조회
   */
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