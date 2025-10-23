# Dockerfile para Medical Record Service
FROM node:22-alpine

# Crear directorio de la aplicación
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./
COPY tsconfig.json ./

# Instalar dependencias
RUN npm ci --only=production

# Copiar código fuente
COPY src ./src

# Compilar TypeScript
RUN npm run build

# Crear directorios necesarios
RUN mkdir -p /app/logs /app/uploads

# Exponer puerto
EXPOSE 3004

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=3004

# Comando para iniciar la aplicación
CMD ["node", "dist/index.js"]
