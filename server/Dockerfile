FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm install --omit=dev

COPY src ./src
# swagger.yaml копируется из контекста сборки (корень репозитория) — см. docker-compose.yml
COPY docs/swagger.yaml ./docs/swagger.yaml

ENV PORT=3000
EXPOSE 3000

# Миграции применяются автоматически при старте (src/index.js)
CMD ["node", "src/index.js"]
