# HealthBridge Appointment Service - Dockerfile
FROM node:18-alpine

LABEL maintainer="HealthBridge Team"
LABEL version="1.0.0"
LABEL description="Appointment management service for HealthBridge medical platform"

# Crear directorio de la aplicación
WORKDIR /app

# Instalar dependencias del sistema
RUN apk add --no-cache \
    dumb-init \
    && rm -rf /var/cache/apk/*

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias de producción
RUN npm ci && npm cache clean --force


# Crear usuario no-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S appointments -u 1001 -G nodejs

# Copiar código fuente
COPY --chown=appointments:nodejs . .

# Compilar TypeScript
RUN npm run build

# Crear directorio de logs
RUN mkdir -p logs && chown appointments:nodejs logs

# Cambiar a usuario no-root
USER appointments

# Exponer puerto
EXPOSE 3003

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3003/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Comando de inicio
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]