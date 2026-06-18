# 🍼 AIoT 기반 신생아 케어 보조 시스템

### AIoT 기반 신생아 환경 모니터링 및 자동 제어 시스템

---

## 📌 프로젝트 소개

AI(Artificial Intelligence)와 IoT(Internet of Things)를 결합하여 신생아의 상태와 주변 환경을 실시간으로 분석하고 보호자에게 정보를 제공하는 **AIoT 기반 스마트 육아 보조 시스템**입니다.

센서·카메라·마이크를 통해 수집된 데이터를 AI 분석 모델로 처리하여 **환경 모니터링, 체온 감지, 울음 감지, 자동 환경 제어, 리포트 생성 기능**을 제공합니다.

또한 모바일 애플리케이션을 통해 언제 어디서나 실시간 상태를 확인하고 알림을 받을 수 있도록 설계되었습니다.

---

# 🎯 설계 목적

### 1. IoT 센서 네트워크 설계 및 데이터 통신 구조 이해

* 센서 데이터 수집 및 실시간 통신 구조 설계
* IoT 디바이스 간 데이터 흐름 이해

### 2. AI 기반 신호 분석 및 감지 알고리즘 설계

* 영상 및 음성 데이터 분석
* 객체 인식 및 상태 분석 모델 적용

### 3. 통합 하드웨어 설계 경험 습득

* 센서·카메라·마이크 기반 시스템 구축
* Raspberry Pi 기반 AIoT 환경 구성

### 4. 실시간 모니터링 및 리포트 시스템 구현

* Dashboard UI/UX 설계
* 데이터 시각화 및 분석 기능 구현

### 5. 스마트홈 연동 및 자동 제어 구현

* SmartThings 기반 자동 제어
* 실시간 환경 최적화

---

# 🧠 기술 스택

| 영역                 | 기술                                                                            |
| ------------------ | ----------------------------------------------------------------------------- |
| **AI / 분석**        | YOLO · MediaPipe · Wav2Vec · ONNX Runtime                                     |
| **Backend**        | Node.js · Flask · REST API · Scheduler                                        |
| **Database**       | MongoDB                                                                       |
| **Mobile**         | Android Studio · Java · Dashboard UI                                          |
| **IoT / Hardware** | Raspberry Pi · Camera Module · Thermal Camera · Temperature & Humidity Sensor |
| **Smart Home**     | SmartThings API                                                               |
| **DevOps / Infra** | Docker · DockerHub · Kubernetes · Nginx · AWS                                 |
| **Collaboration**  | Git · GitHub                                                                  |

---

# 🚀 주요 기능

| 기능              | 설명                   |
| --------------- | -------------------- |
| 🌡️ 온·습도 감지     | 실시간 환경 측정 및 이상 환경 감지 |
| 📷 베이비캠 및 체온 감지 | 얼굴 검출 및 열화상 기반 체온 분석 |
| 🎤 울음 감지        | Wav2Vec 기반 울음 여부 분석  |
| 📊 AI 리포트 생성    | 수면 및 환경 변화 데이터 시각화   |
| 🏠 자동 환경 제어     | SmartThings 기반 자동 제어 |
| 🔔 사용자 알림       | 이상 상태 발생 시 실시간 알림    |
| 🔐 사용자 인증       | 회원가입 및 로그인           |
| 📱 실시간 모니터링     | 모바일 Dashboard 제공     |
| 📅 육아 일정 관리     | 예방접종 및 검진 일정 알림      |
| 📈 로그 및 통계      | 이상 이벤트 저장 및 통계       |
| ♻️ 오토힐링         | 서버 장애 자동 복구          |
| 📡 관측가능성        | 시스템 모니터링 및 상태 관리     |

---

# 👥 팀 수행 내용

## 📌 기획 및 설계

* 시장 조사 및 요구사항 분석
* 기능 블록도 설계
* 시스템 아키텍처 설계
* 서비스 정책 정의
* 통합 테스트 계획 수립

### 사용 기술

`Draw.io`
`Architecture Design`
`Functional Block Diagram`

---

## 📌 AI 분석 시스템 개발

* 얼굴 검출 및 영역 분석
* 울음 감지 모델 학습
* AI 추론 서버 구축
* 수면 점수 분석
* 리포트 생성 기능 구현

### 사용 기술

`YOLO`
`MediaPipe`
`Wav2Vec`
`ONNX Runtime`
`Flask`
`Python`

---

## 📌 IoT 및 하드웨어 개발

* 센서 데이터 수집
* 카메라 및 스트리밍 구현
* 열화상 체온 분석
* SmartThings 자동 제어 연동

### 사용 기술

`Raspberry Pi`
`Temperature Sensor`
`Humidity Sensor`
`Camera Module`
`Thermal Camera`
`SmartThings API`

---

## 📌 서버 및 백엔드 개발

* API 서버 구축
* AI 서버 연동
* 사용자 인증
* 이벤트 및 알림 처리
* 스케줄링 기능 개발

### 사용 기술

`Node.js`
`Flask`
`REST API`
`MongoDB`

---

## 📌 모바일 및 사용자 서비스 개발

* Dashboard UI 구성
* 데이터 시각화
* 푸시 알림
* 일정 관리 기능

### 사용 기술

`Android Studio`
`Java`

---

## 📌 인프라 및 운영 환경 구축

* 컨테이너 환경 구성
* 배포 및 운영 자동화
* 오토힐링 구성
* 관측가능성 환경 구축

### 사용 기술

`Docker`
`DockerHub`
`Kubernetes`
`Nginx`
`AWS`
`Git`
`GitHub`

---

# 🏗 시스템 아키텍처

> 아래 위치에 아키텍처 이미지 추가

```md
/assets/system_architecture.png
```

<p align="center">
  <img src="./assets/system_architecture.png" width="95%">
</p>

---

# 📈 기대 효과

* 신생아 상태 실시간 분석
* 보호자 육아 부담 감소
* 스마트홈 기반 자동 케어 환경 구축
* AI 기반 예방형 육아 서비스 제공

---

# 📷 결과 화면

> 추후 앱 화면 및 시연 이미지 추가 예정

---
