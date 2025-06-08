# Этап сборки (builder)
FROM node:20-alpine AS builder

# Устанавливаем рабочую директорию
WORKDIR /usr/src/app

# Копируем package.json и package-lock.json (или yarn.lock)
COPY package*.json ./

# Устанавливаем все зависимости, включая devDependencies
# Используем 'npm ci' для более надежной установки на основе package-lock.json
RUN npm ci

# Копируем исходный код приложения
COPY . .

# Собираем приложение
RUN npm run build

# Этап продакшена (production)
FROM node:20-alpine AS production

ENV NODE_ENV=production

# Устанавливаем рабочую директорию
WORKDIR /usr/src/app

# Копируем package.json и package-lock.json (или yarn.lock)
COPY package*.json ./

# Устанавливаем только production-зависимости
RUN npm ci --omit=dev

# Копируем скомпилированное приложение из этапа сборки
COPY --from=builder /usr/src/app/dist ./dist

# Порт, на котором работает приложение (по умолчанию для NestJS это 3000)
EXPOSE 3000

# Команда для запуска приложения
CMD ["node", "dist/main.js"]
