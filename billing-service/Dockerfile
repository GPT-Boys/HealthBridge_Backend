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


# Exponer el puerto correcto para billing-service
EXPOSE 3006

# 3️⃣ Comando para iniciar el servicio
CMD ["node", "dist/index.js"]
