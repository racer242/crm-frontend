# ============================================================
# Stage 1: deps — установка всех зависимостей
# ============================================================
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --omit=dev --ignore-scripts

# ============================================================
# Stage 2: builder — сборка приложения
# ============================================================
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --ignore-scripts
COPY . .
RUN npm run build

# ============================================================
# Stage 3: runner — минимальный production-образ
# ============================================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3028

# Копируем standalone-сборку из builder
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/config ./config
COPY --from=builder /app/messages ./messages

# Копируем node_modules production (на случай если standalone не хватило)
COPY --from=deps /app/node_modules ./node_modules

EXPOSE 3028

CMD ["node", "server.js"]