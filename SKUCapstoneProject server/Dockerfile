FROM node:20

WORKDIR /app

# ← ffmpeg 추가 필수!
RUN apk add --no-cache ffmpeg

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 3001
EXPOSE 8888/udp

CMD ["node", "app.js"]