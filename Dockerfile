# Используем официальный Node.js образ
FROM node:22-alpine AS base

# Устанавливаем pnpm глобально
RUN corepack enable && corepack prepare pnpm@10.20.0 --activate

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем файлы зависимостей
COPY package.json pnpm-lock.yaml* ./

# Устанавливаем зависимости
RUN pnpm install --frozen-lockfile

# Копируем исходный код
COPY . .

# Собираем проект
RUN pnpm run build

# Production образ
FROM node:22-alpine AS production

WORKDIR /app

# Копируем package.json и устанавливаем только production зависимости
COPY package.json pnpm-lock.yaml* ./
RUN corepack enable && corepack prepare pnpm@10.20.0 --activate && \
    pnpm install --frozen-lockfile --prod

# Копируем собранные файлы из build стадии
COPY --from=base /app/dist ./dist

# Устанавливаем пользователя для безопасности
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

# Команда по умолчанию (для библиотеки может быть не нужна, но оставлена для совместимости)
CMD ["node", "dist/src/index.js"]
