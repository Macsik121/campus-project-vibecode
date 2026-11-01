FROM node:22-alpine

WORKDIR /app

# ВАЖНО: контекст сборки — КОРЕНЬ репозитория (/campus), а не server/
# (см. docker-compose.yml: build.context: . , build.dockerfile: server/Dockerfile),
# поэтому все пути от /campus: server/..., docs/...
COPY server/package.json server/package-lock.json* ./
RUN npm ci --omit=dev || npm install --omit=dev

COPY server/src ./src
COPY docs/swagger.yaml ./docs/swagger.yaml

ENV PORT=3000
ENV NODE_ENV=production
EXPOSE 3000

# Миграции применяются автоматически при старте (src/index.js)
# Seed: docker compose exec server node src/db/seed.js
CMD ["node", "src/index.js"]
