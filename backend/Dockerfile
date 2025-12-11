## 1. БАЗОВИЙ ОБРАЗ
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
COPY tsconfig.base.json ./
COPY tsconfig.json ./
RUN npm ci

COPY ./src ./src
COPY ./shared ./shared

RUN npm run build 

EXPOSE 3000

CMD [ "npm", "start" ]