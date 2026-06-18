FROM python:3.10-slim

WORKDIR /app

# 2. FFmpeg 관련 시스템 패키지 설치
RUN apt-get update && apt-get install -y \
    pkg-config \
    gcc \
    libavcodec-dev \
    libavformat-dev \
    libavfilter-dev \
    libavdevice-dev \
    libswresample-dev \
    libswscale-dev \
    && rm -rf /var/lib/apt/lists/*

# 3. 라이브러리 설치 (가장 기본적인 형태로 복구)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 4. 소스코드 복사 및 실행
COPY . .

EXPOSE 5000

CMD ["python", "app.py"]