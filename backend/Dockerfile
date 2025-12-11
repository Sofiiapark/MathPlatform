# Dockerfile бекенду (виправлено)
FROM node:18-alpine

WORKDIR /app

# 1. Копіюємо package.json та встановлюємо ВСІ залежності
COPY package*.json ./
COPY tsconfig*.json ./

# Змінено: використовуємо 'npm install' або 'npm ci' без --production
RUN npm install
# АБО, якщо ви хочете 'npm ci' і він має встановити всі, переконайтесь, що він не обмежує production:
# RUN npm ci

# 2. Копіюємо джерельний код
COPY src ./src

# 3. КОМПІЛЯЦІЯ: Тепер 'tsc' знайдено
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]