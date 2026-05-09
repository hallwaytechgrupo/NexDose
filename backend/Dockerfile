FROM node:20-alpine AS base
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY server.ts ./

RUN npm run build

EXPOSE 3000
CMD ["npm", "run", "start"]
