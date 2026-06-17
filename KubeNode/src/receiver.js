const dgram = require('dgram')
const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')
const mqtt = require('mqtt')

const videoController = require('./controllers/videoController')
const soundAnalysisController = require('./controllers/soundAnalysisController')
const temhuController = require('./controllers/TemhuController')
const stController = require('./controllers/smartThingsController')

let wss

// =========================================================
// 설정
// =========================================================
const UDP_PORT = parseInt(process.env.UDP_PORT) || 8888

const HLS_DIR =
    process.env.HLS_DIR ||
    path.resolve(__dirname, '../public/stream')

const CAMERA_TIMEOUT_MS =
    parseInt(process.env.CAMERA_TIMEOUT_MS) || 5000

const FRAME_WIDTH = 1280
const FRAME_HEIGHT = 720
const FRAME_SIZE = FRAME_WIDTH * FRAME_HEIGHT * 3

// =========================================================
// HLS 폴더 준비
// =========================================================
if (!fs.existsSync(HLS_DIR)) {
    fs.mkdirSync(HLS_DIR, { recursive: true })
} else {
    // 서버 재시작 시 기존 파일 삭제
    fs.readdirSync(HLS_DIR).forEach(file => {
        fs.unlinkSync(path.join(HLS_DIR, file))
    })
}

function clearHlsDir() {
    if (!fs.existsSync(HLS_DIR)) return
    fs.readdirSync(HLS_DIR).forEach(file => {
        try {
            fs.unlinkSync(path.join(HLS_DIR, file))
        } catch (_) {}
    })
}

// =========================================================
// FFMPEG: 분석용 (raw RGB + raw audio)
// =========================================================
const ffmpegProcess = spawn('ffmpeg', [
    '-fflags', '+discardcorrupt',
    '-f', 'mpegts',
    '-i', 'pipe:0',

    // 영상 → pipe:1
    '-map', '0:v',
    '-vf', `scale=${FRAME_WIDTH}:${FRAME_HEIGHT}`,
    '-f', 'rawvideo',
    '-pix_fmt', 'rgb24',
    'pipe:1',

    // 오디오 → pipe:3 (오디오 없으면 그냥 건너뜀: 0:a?)
    '-map', '0:a?',
    '-f', 'f32le',
    '-ar', '48000',
    '-ac', '1',
    'pipe:3'
], {
    stdio: ['pipe', 'pipe', 'pipe', 'pipe']
})

// stderr 읽어서 파이프 안 막히게
ffmpegProcess.stderr.on('data', () => {})
ffmpegProcess.on('exit', (code, signal) => {
    console.error(`[ff-analysis] 종료 code: ${code} signal: ${signal}`)
})
ffmpegProcess.on('error', (err) => {
    console.error('[ff-analysis] 실행 에러:', err.message)
})

// =========================================================
// 비디오 프레임 처리
// =========================================================
let frameBuffer = Buffer.alloc(0)

ffmpegProcess.stdout.on('data', (chunk) => {
    frameBuffer = Buffer.concat([frameBuffer, chunk])

    while (frameBuffer.length >= FRAME_SIZE) {
        const frame = frameBuffer.slice(0, FRAME_SIZE)
        frameBuffer = frameBuffer.slice(FRAME_SIZE)
        videoController.onFrame(frame)
    }
})

// =========================================================
// 오디오 처리
// =========================================================
ffmpegProcess.stdio[3].on('data', (audioChunk) => {
    soundAnalysisController.onAudio(audioChunk)
})

// =========================================================
// FFMPEG: HLS 스트리밍
// =========================================================
const hlsProcess = spawn('ffmpeg', [
    '-f', 'mpegts',
    '-i', 'pipe:0',
    '-c:v', 'copy',
    '-c:a', 'copy',
    '-f', 'hls',
    '-hls_time', '2',
    '-hls_list_size', '5',
    '-hls_flags', 'delete_segments+append_list',
    '-hls_allow_cache', '0',
    '-hls_segment_filename', path.join(HLS_DIR, 'streamingfile%d.ts'),
    path.join(HLS_DIR, 'streamingfile.m3u8')
], {
    stdio: ['pipe', 'pipe', 'pipe']
})

hlsProcess.stderr.on('data', () => {})
hlsProcess.on('exit', (code, signal) => {
    console.error(`[ff-hls] 종료 code: ${code} signal: ${signal}`)
})
hlsProcess.on('error', (err) => {
    console.error('[ff-hls] 실행 에러:', err.message)
})

// =========================================================
// UDP 서버
// =========================================================
const udpServer = dgram.createSocket('udp4')

let lastMessageTime = Date.now()
let firstPacketLogged = false

udpServer.on('message', (msg) => {
    if (!firstPacketLogged) {
        console.log(`📥 UDP 첫 패킷 수신: ${msg.length} bytes`)
        firstPacketLogged = true
    }

    lastMessageTime = Date.now()

    try {
        ffmpegProcess.stdin.write(msg)
        hlsProcess.stdin.write(msg)
    } catch (err) {
        console.error('[UDP] stdin write 에러:', err.message)
    }
})

udpServer.on('error', (err) => {
    console.error('[UDP] 에러:', err)
    udpServer.close()
})

// 카메라 끊김 감지: 타임아웃 지나면 HLS 파일 삭제
// 객체인식 음성분석도 초기화
setInterval(() => {
    if (Date.now() - lastMessageTime > CAMERA_TIMEOUT_MS) {
        clearHlsDir()
        soundAnalysisController.analysisResults = []
        soundAnalysisController.analysisHistory = []
        soundAnalysisController.audioBuffer = []
        soundAnalysisController.audioFlag = 0
        soundAnalysisController.silentCount = 0
        soundAnalysisController.notCryingCount = 0
        soundAnalysisController.isAnalyzing = false
        soundAnalysisController.dbSamples = []
        soundAnalysisController.currentCryEvent = null
        videoController.currentFrame = null
        videoController.frameBuffer = []
        videoController.isAnalyzing = false
        videoController.latestThermal = null
        videoController.analysisResults = []
    }
}, CAMERA_TIMEOUT_MS)

// =========================================================
// MQTT
// =========================================================
const MQTT_HOST = process.env.MQTT_HOST || 'localhost'
const mqttClient = mqtt.connect(`mqtt://${MQTT_HOST}:1883`)

mqttClient.on('connect', () => {
    mqttClient.subscribe('baby/thermal')
    mqttClient.subscribe('baby/environment')
    console.log(`📡 MQTT 연결됨 (${MQTT_HOST}:1883)`)
})

mqttClient.on('error', (err) => {
    console.error('[MQTT] 에러:', err.message)
})

mqttClient.on('message', (topic, message) => {
    let data
    try {
        data = JSON.parse(message.toString())
    } catch (err) {
        console.error('[MQTT] JSON 파싱 실패:', err.message)
        return
    }

    // ─────────────────────────────────────────────────────
    // 열화상
    // ─────────────────────────────────────────────────────
    if (topic === 'baby/thermal') {
        const avg = (
            data.frame.reduce((a, b) => a + b, 0) / data.frame.length
        ).toFixed(2)

        console.log(
            `[MQTT] 열화상 평균온도: ${avg}`
        )

        videoController.onThermal(data)
    }

    // ─────────────────────────────────────────────────────
    // 온습도
    // ─────────────────────────────────────────────────────
    else if (topic === 'baby/environment') {
        console.log(
             `[MQTT] 온습도 수신: ${data.temperature}°C ${data.humidity}%`
        )

        temhuController.onData(data)
        stController.onData(data.humidity)
    }
})

// =========================================================
// INIT
// =========================================================
function init(wssInstance) {
    wss = wssInstance

    udpServer.bind(UDP_PORT, () => {
        console.log(`📡 UDP 수신 대기 중 (${UDP_PORT})`)
    })
}

module.exports = { init }
