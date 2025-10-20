# ===============================
# HealthBridge Microservice Base
# ===============================

# 1️⃣ Etapa base (construcción)
FROM node:20-alpine AS base
WORKDIR /app

# Copiar definiciones de dependencias
COPY package*.json ./

# Instalar dependencias (solo las necesarias para producción)
RUN npm install --omit=dev

# Copiar el código fuente
COPY . .

# Variables de entorno por defecto (puedes sobreescribirlas en docker-compose.yml)
ENV NODE_ENV=production

# 2️⃣ Exponer el puerto — AJUSTAR SEGÚN SERVICIO
# auth-service: 3001
# user-service: 3002
# appointment-service: 3003
# notification-service: 3004
# billing-service: 3005
EXPOSE 3005

# 3️⃣ Comando para iniciar el servicio
CMD ["npm", "run", "start"]
