FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
COPY tsconfig*.json ./

COPY src ./src

RUN npm ci
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
