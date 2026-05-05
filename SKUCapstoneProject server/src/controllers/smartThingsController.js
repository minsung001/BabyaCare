const axios = require('axios');
const SmartThings = require('../models/SmartThings');
const User = require('../models/User');

exports.registerSmartThings = async (req, res) => {
  const { token, email } = req.body;
  const userId = req.user.userId || req.user.id;

  console.log('\n[ST_PROCESS] ======= SmartThings 연동 시작 =======');
  console.log('[ST_INFO] 요청 유저:', email, userId);

  if (!token || token.length < 10) {
    return res.status(400).json({
      ok: false,
      message: '유효한 SmartThings 토큰을 입력해주세요.'
    });
  }

  try {
    const userExists = await User.findById(userId);

    if (!userExists) {
      return res.status(404).json({
        ok: false,
        message: '사용자 정보를 찾을 수 없습니다.'
      });
    }

    console.log('[ST_API] 삼성 서버로 기기 목록 요청 중...');

    const stResponse = await axios.get('https://api.smartthings.com/v1/devices', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 7000
    });

    const devices = stResponse.data.items || [];

    console.log(`[ST_API] 삼성 서버 응답 성공. 발견된 기기: ${devices.length}개`);

    const updatedData = await SmartThings.findOneAndUpdate(
      { userId },
      {
        userEmail: email,
        patToken: token,
        deviceCount: devices.length,
        updatedAt: Date.now()
      }, 
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    );

    console.log('[ST_DB] MongoDB 저장 완료:', updatedData._id);

    const mappedDevices = devices.map(device => ({
      deviceId: device.deviceId,
      name: device.name,
      label: device.label || device.name,
      deviceTypeName: device.deviceTypeName,
      locationId: device.locationId
    }));

    return res.status(200).json({
      ok: true,
      message: 'SmartThings 연동 및 기기 동기화가 완료되었습니다.',
      devices: mappedDevices
    });
  } catch (error) {
    console.error('\n[ST_CRITICAL_ERROR] 연동 실패 상세 로그:');

    if (error.response) {
      console.error('삼성 API 에러 코드:', error.response.status);
      console.error('에러 내용:', error.response.data);

      return res.status(401).json({
        ok: false,
        message: '삼성 인증 토큰이 유효하지 않거나 만료되었습니다.'
      });
    }

    if (error.request) {
      console.error('네트워크 타임아웃 또는 삼성 서버 응답 없음');

      return res.status(503).json({
        ok: false,
        message: '삼성 서버와 통신할 수 없습니다. 잠시 후 다시 시도해주세요.'
      });
    }

    console.error('내부 로직 에러:', error.message);

    return res.status(500).json({
      ok: false,
      message: '서버 내부 처리 중 오류가 발생했습니다.'
    });
  }
};

exports.getUserDevices = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;

    const stInfo = await SmartThings.findOne({ userId });

    if (!stInfo || !stInfo.patToken) {
      return res.status(200).json({
        ok: true,
        devices: [],
        message: '연동된 기기가 없습니다.'
      });
    }

    const response = await axios.get('https://api.smartthings.com/v1/devices', {
      headers: {
        Authorization: `Bearer ${stInfo.patToken}`
      },
      timeout: 7000
    });

    const devices = (response.data.items || []).map(device => ({
      deviceId: device.deviceId,
      name: device.name,
      label: device.label || device.name,
      deviceTypeName: device.deviceTypeName,
      locationId: device.locationId,
      status: 'online'
    }));

    return res.status(200).json({
      ok: true,
      devices
    });
  } catch (error) {
    console.error('[ST_GET_ERROR] 기기 목록 로드 실패:', error.message);

    if (error.response && error.response.status === 401) {
      return res.status(401).json({
        ok: false,
        message: '인증이 만료되었습니다. 다시 연동해주세요.'
      });
    }

    return res.status(500).json({
      ok: false,
      message: '기기 목록을 가져오는 중 오류가 발생했습니다.'
    });
  }
};