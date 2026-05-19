# Stage 1: Build frontend
FROM node:20-alpine AS build-stage
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20-alpine
WORKDIR /app

RUN apk add --no-cache python3-dev py3-pip && pip install Pillow httpx ytmusicapi yt-dlp
COPY package*.json ./
RUN npm install --production

COPY --from=build-stage /app/dist ./dist
COPY server ./server

ENV NODE_ENV=production
ENV BACKEND_PORT=3001

EXPOSE 3001

CMD ["node", "server/index.js"]