# -------- Stage 1: builder --------
FROM node:18-alpine AS builder

WORKDIR /app

# Копіюємо package.json AI сервісу
COPY package*.json ./
COPY tsconfig*.json ./

RUN npm install

# Копіюємо тільки код AI
COPY src ./src

# Компіляція
RUN npm run build

# -------- Stage 2: runtime --------
FROM node:18-alpine AS runtime

WORKDIR /app

COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

USER node

CMD ["node", "dist/index.js"]
