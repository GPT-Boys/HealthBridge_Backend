# Etapa 1: Compilación de TypeScript
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

# Etapa 2: Ejecución del servicio
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY package*.json ./

RUN npm install --omit=dev

ENV NODE_ENV=production
EXPOSE 3005

CMD ["node", "dist/index.js"]
