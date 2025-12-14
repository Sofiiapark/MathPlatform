# Dockerfile.ai
# ---------------- Stage 1: builder (Стадія компіляції) --------
FROM node:18-alpine AS builder

WORKDIR /app

# Копіюємо package.json та tsconfig
COPY package*.json ./
COPY tsconfig*.json ./

RUN npm install

# Копіюємо тільки код AI
COPY src ./src

# Компіляція
# Це має скомпілювати ваш код у папку dist/ (включаючи otel-instrumentation.js)
RUN npm run build 

# ---------------- Stage 2: runtime (Стадія виконання) --------
FROM node:18-alpine AS runtime

WORKDIR /app

# Копіюємо тільки залежності для продакшну (для безпеки та розміру)
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./
RUN npm install --only=production
# Копіювання node_modules тут не є найкращою практикою, краще перевстановити, 
# але якщо builder має тільки production deps, можна скопіювати так:
# COPY --from=builder /app/node_modules ./node_modules 


# Копіюємо скомпільований код (index.js та otel-instrumentation.js)
COPY --from=builder /app/dist ./dist

# УВАГА: Якщо ви не компілюєте otel-instrumentation.ts у dist/, вам потрібно копіювати його окремо:
# COPY --from=builder /app/otel-instrumentation.js ./otel-instrumentation.js


USER node

# ОНОВЛЕНО: Використовуємо -r для попереднього завантаження OpenTelemetry
CMD ["node", "-r", "./dist/otel-instrumentation.js", "dist/index.js"]