# -------- Stage 1: builder --------
FROM node:18-alpine AS builder

WORKDIR /app

# Копіюємо залежності
COPY package*.json ./
COPY tsconfig.base.json ./
RUN npm install

# Копіюємо код для збірки
COPY shared ./shared
COPY src ./src
RUN npm run build

# -------- Stage 2: runtime --------
FROM node:18-alpine AS runtime

WORKDIR /app

# Копіюємо тільки production deps та dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/shared ./shared

# Використовуємо безпечного користувача
USER node

CMD ["node", "dist/index.js"]
