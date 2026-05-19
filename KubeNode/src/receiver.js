const dgram = require('dgram')
const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')
const mqtt = require('mqtt')

// 8888포트로 들어온 영상 중 프레임만 비디오컨트롤러로 보내기 위함
const videoController = require('./controllers/videoController')
const soundAnalysisController = require('./controllers/soundAnalysisController')
const temhuController = require('./controllers/TemhuController')

let wss

// =========================================================
// HLS 파일 저장 폴더 생성
// =========================================================
const UDP_PORT =
    parseInt(process.env.UDP_PORT) || 8888

const HLS_DIR =
    process.env.HLS_DIR ||
    path.resolve(__dirname, '../public/stream')

const hlsDir = HLS_DIR

const CAMERA_TIMEOUT_MS =
    parseInt(process.env.CAMERA_TIMEOUT_MS) || 5000

if (!fs.existsSync(hlsDir)) {

    fs.mkdirSync(hlsDir, {
        recursive: true
    })

} else {

    // 서버 재시작 시 기존 파일 삭제
    fs.readdirSync(hlsDir).forEach(file => {

        fs.unlinkSync(
            path.join(hlsDir, file)
        )
    })
}

// =========================================================
// UDP SERVER
// =========================================================
const udpServer = dgram.createSocket('udp4')

let lastMessageTime = Date.now()

udpServer.on('message', (msg) => {

    lastMessageTime = Date.now()

    // ffmpeg으로 영상/오디오 분리 (분석용)
    ffmpegProcess.stdin.write(msg)

    // HLS 스트리밍용
    hlsProcess.stdin.write(msg)
})

// CAMERA_TIMEOUT_MS 이상 데이터 없으면
// HLS 파일 삭제 (카메라 끊김 감지)
setInterval(() => {

    if (
        Date.now() - lastMessageTime >
        CAMERA_TIMEOUT_MS
    ) {

        if (fs.existsSync(hlsDir)) {

            fs.readdirSync(hlsDir).forEach(file => {

                fs.unlinkSync(
                    path.join(hlsDir, file)
                )
            })
        }
    }

}, CAMERA_TIMEOUT_MS)

udpServer.on('error', (err) => {

    console.error('UDP 에러:', err)

    udpServer.close()
})

// =========================================================
// FFMPEG PROCESS
// =========================================================

// 분석용 ffmpeg
const ffmpegProcess = spawn('ffmpeg', [

    '-fflags',
    '+discardcorrupt',

    '-f',
    'mpegts',

    '-i',
    'pipe:0',

    '-map',
    '0:v',

    '-f',
    'rawvideo',

    '-pix_fmt',
    'rgb24',

    'pipe:1',

    '-map',
    '0:a',

    '-f',
    'f32le',

    '-ar',
    '48000',

    '-ac',
    '1',

    'pipe:3'

], {
    stdio: ['pipe', 'pipe', 'pipe', 'pipe']
})

// =========================================================
// VIDEO FRAME PROCESSING
// =========================================================
const FRAME_SIZE = 1280 * 720 * 3

let frameBuffer = Buffer.alloc(0)

ffmpegProcess.stdout.on('data', (chunk) => {

    frameBuffer = Buffer.concat([
        frameBuffer,
        chunk
    ])

    while (
        frameBuffer.length >= FRAME_SIZE
    ) {

        const frame =
            frameBuffer.slice(0, FRAME_SIZE)

        frameBuffer =
            frameBuffer.slice(FRAME_SIZE)

        videoController.onFrame(frame)
    }
})

// =========================================================
// AUDIO PROCESSING
// =========================================================
ffmpegProcess.stdio[3].on(
    'data',
    (audioChunk) => {

        soundAnalysisController.onAudio(
            audioChunk
        )
    }
)

// =========================================================
// HLS STREAM PROCESS
// =========================================================
const hlsProcess = spawn('ffmpeg', [

    '-f',
    'mpegts',

    '-i',
    'pipe:0',

    '-c:v',
    'copy',

    '-c:a',
    'copy',

    '-f',
    'hls',

    '-hls_time',
    '2',

    '-hls_list_size',
    '5',

    '-hls_flags',
    'delete_segments+append_list',

    '-hls_allow_cache',
    '0',

    '-hls_segment_filename',
    path.join(
        hlsDir,
        'streamingfile%d.ts'
    ),

    path.join(
        hlsDir,
        'streamingfile.m3u8'
    )

], {
    stdio: ['pipe', 'pipe', 'pipe']
})

// =========================================================
// MQTT
// =========================================================
const mqttClient = mqtt.connect(
    `mqtt://${process.env.MQTT_HOST || 'localhost'}:1883`
)

mqttClient.on('connect', () => {

    mqttClient.subscribe('baby/thermal')
    mqttClient.subscribe('baby/environment')

    console.log('📡 MQTT 연결됨')
})

mqttClient.on('message', (topic, message) => {

    const data = JSON.parse(
        message.toString()
    )

    // =====================================================
    // 열화상
    // =====================================================
    if (topic === 'baby/thermal') {

        const avg = (

            data.frame.reduce(
                (a, b) => a + b,
                0
            )

            / data.frame.length

        ).toFixed(2)

        console.log(
            '[MQTT] 열화상 수신:',
            data.timestamp,
            '프레임 길이:',
            data.frame.length,
            '평균온도:',
            avg
        )

        videoController.onThermal(data)
    }

    // =====================================================
    // 온습도
    // =====================================================
    else if (
        topic === 'baby/environment'
    ) {

        console.log(
            '[MQTT] 온습도 수신:',
            data.temperature,
            '°C',
            data.humidity,
            '%'
        )

        temhuController.onData(data)
    }
})

// =========================================================
// INIT
// =========================================================
function init(wssInstance) {

    wss = wssInstance

    udpServer.bind(
        UDP_PORT,
        () => {

            console.log(
                `📡 UDP 수신 대기 중 (${UDP_PORT})`
            )
        }
    )
}

module.exports = { init }