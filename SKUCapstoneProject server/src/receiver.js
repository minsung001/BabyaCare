const dgram = require('dgram')
const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')

//8888포트로 들어온 영상 중 프레임만 비디오컨트롤러로 보내기 위함
const videoController = require('./controllers/videoController')
const soundAnalysisController = require('./controllers/soundAnalysisController')

let wss

// HLS 파일 저장 폴더 생성
const UDP_PORT = parseInt(process.env.UDP_PORT) || 8888
const HLS_DIR  = process.env.HLS_DIR || path.resolve(__dirname, '../public/stream')
const hlsDir   = HLS_DIR
const CAMERA_TIMEOUT_MS = parseInt(process.env.CAMERA_TIMEOUT_MS) || 5000
if (!fs.existsSync(hlsDir)) {
    fs.mkdirSync(hlsDir, { recursive: true })
} else {
    // 서버 재시작시 기존 파일 삭제
    fs.readdirSync(hlsDir).forEach(file => {
        fs.unlinkSync(path.join(hlsDir, file))
    })
}

const udpServer = dgram.createSocket('udp4')

let lastMessageTime = Date.now()

udpServer.on('message', (msg) => {
    lastMessageTime = Date.now()

    // 영상/오디오 분석하기 위해 분리해서 넣어주기 때문에
    // 스트리밍은 따로 분리하는 쪽이 좋을 것
    //streamController.onPacket(msg)

    // ffmpeg으로 영상/오디오 분리 (분석용)
    ffmpegProcess.stdin.write(msg)

    // HLS 스트리밍용 (재인코딩 없이 컨테이너만 변환)
    hlsProcess.stdin.write(msg)
})

// CAMERA_TIMEOUT_MS 이상 데이터 없으면 HLS 파일 삭제 (카메라 끊김 감지)
setInterval(() => {
    if (Date.now() - lastMessageTime > CAMERA_TIMEOUT_MS) {
        if (fs.existsSync(hlsDir)) {
            fs.readdirSync(hlsDir).forEach(file => {
                fs.unlinkSync(path.join(hlsDir, file))
            })
        }
    }
}, CAMERA_TIMEOUT_MS)

udpServer.on('error', (err) => {
    console.error('UDP 에러:', err)
    udpServer.close()
})

// ffmpeg 프로세스 (분석용 - 영상/오디오 분리)
const ffmpegProcess = spawn('ffmpeg', [
    '-fflags', '+discardcorrupt',  // 추가
    '-f', 'mpegts',
    '-i', 'pipe:0',
    '-map', '0:v',
    '-f', 'rawvideo',
    '-pix_fmt', 'rgb24',
    'pipe:1',
    '-map', '0:a',
    '-f', 'f32le',
    '-ar', '48000',
    '-ac', '1',
    'pipe:3'
], {
    stdio: ['pipe', 'pipe', 'pipe', 'pipe']
})

// 프레임이 완성될 때까지 쌓아서 넘기기
const FRAME_SIZE = 1280 * 720 * 3
let frameBuffer = Buffer.alloc(0)

ffmpegProcess.stdout.on('data', (chunk) => {
    frameBuffer = Buffer.concat([frameBuffer, chunk])
    while (frameBuffer.length >= FRAME_SIZE) {
        const frame = frameBuffer.slice(0, FRAME_SIZE)
        frameBuffer = frameBuffer.slice(FRAME_SIZE)
        videoController.onFrame(frame)
    }
})

ffmpegProcess.stdio[3].on('data', (audioChunk) => {
    // 오디오 → soundController로
    soundAnalysisController.onAudio(audioChunk)
})

// HLS용 ffmpeg
const hlsProcess = spawn('ffmpeg', [
    '-f', 'mpegts',
    '-i', 'pipe:0',
    '-c:v', 'copy',                              // 재인코딩 없음
    '-c:a', 'copy',                              // 재인코딩 없음
    '-f', 'hls',
    '-hls_time', '1',                            // 2초짜리 조각
    '-hls_list_size', '2',                       // 최근 3개 조각만 유지
    '-hls_flags', 'delete_segments+append_list', // 오래된 파일 자동 삭제
    '-hls_allow_cache', '0',                     // 캐시 비활성화
    '-hls_segment_filename', path.join(hlsDir, 'streamingfile%d.ts'),
    path.join(hlsDir, 'streamingfile.m3u8')
], {
    stdio: ['pipe', 'pipe', 'pipe']
})

function init(wssInstance) {
    wss = wssInstance
    udpServer.bind(UDP_PORT, () => {
        console.log(`📡 UDP 수신 대기 중 (${UDP_PORT})`)
    })
}

module.exports = { init }