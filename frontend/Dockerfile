# Stage 1: Build фронтенду
FROM node:18-alpine AS builder
WORKDIR /app

# Копіюємо package.json та package-lock.json
COPY package*.json ./

# Встановлюємо всі залежності
RUN npm install

# Встановлюємо vite глобально, щоб точно був доступний
RUN npm install -g vite

# Копіюємо весь фронтенд
COPY . .

# Будуємо фронтенд
RUN vite build

# Stage 2: nginx для продакшн
FROM nginx:alpine

# Копіюємо власний конфіг nginx
COPY ./nginx.conf /etc/nginx/conf.d/default.conf

# Копіюємо зібрану dist папку
COPY --from=builder /app/dist /usr/share/nginx/html

# Відкритий порт
EXPOSE 80

# Запуск nginx
CMD ["nginx", "-g", "daemon off;"]
