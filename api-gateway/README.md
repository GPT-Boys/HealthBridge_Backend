# 🚪 HealthBridge API Gateway

API Gateway centralizado para el sistema de gestión médica HealthBridge. Punto de entrada único para todos los microservicios del backend.

## 🎯 Características

- ✅ **Proxy reverso** para todos los microservicios
- ✅ **Autenticación y autorización** centralizada con JWT
- ✅ **Rate limiting** configurable por endpoint
- ✅ **CORS** configurado y seguro
- ✅ **Health checks** automáticos de servicios
- ✅ **Logging centralizado** con Winston y rotación diaria
- ✅ **Compresión** de respuestas
- ✅ **Seguridad** con Helmet
- ✅ **Request tracking** con ID único
- ✅ **Error handling** robusto
- ✅ **TypeScript** con tipos estrictos
- ✅ **Hot reload** en desarrollo

## 📋 Requisitos

- Node.js 18+
- npm 9+
- TypeScript 5+

## 🚀 Instalación Rápida

```bash
# Navegar al directorio del api-gateway
cd backend/api-gateway

# Dar permisos a scripts (Linux/Mac)
chmod +x setup.sh start-dev.sh start-prod.sh test-api-gateway.sh

# Instalar y configurar
./setup.sh
```

**Para Windows:**

```bash
npm install
npm run build
```

## ⚙️ Configuración

### Archivos de entorno

El API Gateway usa diferentes archivos `.env` según el entorno:

- `.env.development` - Desarrollo local
- `.env.production` - Producción
- `.env.test` - Testing

**Edita `.env.development` con tus configuraciones:**

```env
PORT=3000
NODE_ENV=development

# JWT (debe coincidir con auth-service)
JWT_SECRET=dev-jwt-secret-key-change-in-production-f8a9b2c3d4e5
JWT_EXPIRES_IN=7d

# Frontend
FRONTEND_URL=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174

# Microservicios
AUTH_SERVICE_URL=http://localhost:3001
USER_SERVICE_URL=http://localhost:3002
APPOINTMENT_SERVICE_URL=http://localhost:3003
MEDICAL_RECORD_SERVICE_URL=http://localhost:3004
NOTIFICATION_SERVICE_URL=http://localhost:3005
BILLING_SERVICE_URL=http://localhost:3006
SUBSCRIPTION_SERVICE_URL=http://localhost:3007

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutos
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=debug

# Health Checks
HEALTH_CHECK_INTERVAL=30000  # 30 segundos
```

## 🏃 Ejecución

### Desarrollo (con hot-reload)

**Linux/Mac:**

```bash
./start-dev.sh
```

**Windows/Alternativo:**

```bash
npm run dev
```

El API Gateway iniciará en `http://localhost:3000`

### Producción

**Linux/Mac:**

```bash
./start-prod.sh
```

**Windows/Alternativo:**

```bash
npm run build
npm start
```

## 📡 Endpoints del API Gateway

### Core Endpoints

| Método | Ruta        | Descripción                 | Autenticación |
| ------ | ----------- | --------------------------- | ------------- |
| GET    | `/`         | Información del API Gateway | No            |
| GET    | `/health`   | Health check completo       | No            |
| GET    | `/metrics`  | Métricas del sistema        | No            |
| GET    | `/services` | Lista de servicios          | No            |

### Servicios Proxy

Todas las peticiones a los microservicios pasan por el API Gateway:

| Ruta API Gateway        | Servicio Destino       | Puerto | Autenticación |
| ----------------------- | ---------------------- | ------ | ------------- |
| `/api/auth/*`           | Auth Service           | 3001   | No\*          |
| `/api/user/*`           | User Service           | 3002   | Sí            |
| `/api/appointment/*`    | Appointment Service    | 3003   | Sí            |
| `/api/medical-record/*` | Medical Record Service | 3004   | Sí            |
| `/api/notification/*`   | Notification Service   | 3005   | Sí            |
| `/api/billing/*`        | Billing Service        | 3006   | Sí            |
| `/api/subscription/*`   | Subscription Service   | 3007   | Sí            |

**\*Nota:** Auth service tiene rutas públicas y protegidas

## 🔐 Autenticación

### Rutas Públicas (No requieren token)

- `/api/auth/login`
- `/api/auth/register`
- `/api/auth/refresh-token`
- `/api/auth/verify-token`
- `/api/plans` (vista pública)
- `/health`
- `/metrics`
- `/`

### Rutas Protegidas

Todas las demás rutas requieren un token JWT válido en el header:

```http
Authorization: Bearer <tu-token-jwt>
```

**Ejemplo con axios (Frontend):**

```javascript
const api = axios.create({
  baseURL: "http://localhost:3000/api",
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
```

## 📊 Monitoreo y Observabilidad

### Health Check Detallado

```bash
curl http://localhost:3000/health | jq
```

**Respuesta incluye:**

- Estado del API Gateway
- Estado de cada microservicio
- Tiempos de respuesta
- Uso de memoria y CPU
- Estado general (healthy/degraded/unhealthy)

**Ejemplo de respuesta:**

```json
{
  "api_gateway": {
    "status": "healthy",
    "uptime": 3600.5,
    "timestamp": "2025-01-20T10:30:00.000Z",
    "environment": "development",
    "memory": {
      "used": 45,
      "total": 128,
      "unit": "MB"
    }
  },
  "services": {
    "auth": {
      "name": "auth",
      "url": "http://localhost:3001",
      "status": "healthy",
      "responseTime": 25
    },
    "user": {
      "name": "user",
      "url": "http://localhost:3002",
      "status": "healthy",
      "responseTime": 18
    }
    // ... otros servicios
  },
  "overall": "healthy"
}
```

### Métricas del Sistema

```bash
curl http://localhost:3000/metrics | jq
```

### Logs

Los logs se guardan automáticamente en:

| Archivo                           | Contenido      | Rotación        |
| --------------------------------- | -------------- | --------------- |
| `logs/error.log`                  | Solo errores   | 5MB             |
| `logs/combined.log`               | Todos los logs | 5MB             |
| `logs/requests.log`               | Requests HTTP  | 5MB             |
| `logs/application-YYYY-MM-DD.log` | Logs diarios   | Diaria, 14 días |

**Ver logs en tiempo real:**

```bash
tail -f logs/combined.log
```

## 🧪 Testing

### Test Automático

```bash
./test-api-gateway.sh
```

### Test Manual

```bash
# Test API Gateway health
curl http://localhost:3000/health

# Test auth proxy (debe responder 200)
curl http://localhost:3000/api/auth/health

# Test endpoint protegido (debe responder 401)
curl http://localhost:3000/api/user/profile

# Test con token
curl -H "Authorization: Bearer <token>" \
     http://localhost:3000/api/user/profile
```

## 🐳 Docker

### Build

```bash
docker build -t healthbridge-api-gateway .
```

### Run

```bash
docker run -p 3000:3000 --env-file .env.production healthbridge-api-gateway
```

### Docker Compose (con todos los servicios)

```yaml
version: "3.8"
services:
  api-gateway:
    build: ./api-gateway
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    depends_on:
      - auth-service
      - user-service
    networks:
      - healthbridge-network

  auth-service:
    build: ./auth-service
    ports:
      - "3001:3001"
    networks:
      - healthbridge-network

networks:
  healthbridge-network:
    driver: bridge
```

## 🚀 Despliegue a Producción

### Render.com

1. Crear nuevo **Web Service**
2. Conectar repositorio
3. **Root Directory:** `backend/api-gateway`
4. **Build Command:** `npm install && npm run build`
5. **Start Command:** `npm start`
6. **Environment Variables:** Configurar todas las variables de `.env.production`

### Railway.app

```bash
railway login
railway init
railway up
```

### Variables de Entorno Requeridas en Producción

```env
NODE_ENV=production
PORT=3000
JWT_SECRET=<strong-secret-key>
JWT_REFRESH_SECRET=<strong-refresh-key>
FRONTEND_URL=https://tu-frontend.vercel.app
ALLOWED_ORIGINS=https://tu-frontend.vercel.app
AUTH_SERVICE_URL=https://healthbridge-auth.render.com
# ... otras URLs de servicios
```

## 📦 Estructura de Archivos

```
api-gateway/
├── src/
│   ├── config/
│   │   ├── env.ts                    # Configuración de variables de entorno
│   │   ├── services.config.ts        # Configuración de microservicios
│   │   └── proxy.config.ts          # Configuración de proxy
│   ├── middleware/
│   │   ├── auth.middleware.ts        # Autenticación JWT
│   │   ├── cors.middleware.ts        # CORS
│   │   ├── logger.middleware.ts      # Logging HTTP
│   │   ├── rateLimit.middleware.ts   # Rate limiting
│   │   └── errorHandler.middleware.ts # Manejo de errores
│   ├── utils/
│   │   ├── logger.ts                 # Winston logger
│   │   ├── jwt.utils.ts              # Utilidades JWT
│   │   ├── healthCheck.ts            # Health checker
│   │   └── requestTracker.ts         # Request ID tracking
│   └── index.ts                      # Entrada principal
├── logs/                             # Directorio de logs
├── dist/                             # Build de producción
├── .env.development                  # Variables desarrollo
├── .env.production                   # Variables producción
├── .env.example                      # Ejemplo de variables
├── package.json
├── tsconfig.json
├── nodemon.json
├── Dockerfile
├── .dockerignore
├── .gitignore
├── setup.sh                          # Script de instalación
├── start-dev.sh                      # Script desarrollo
├── start-prod.sh                     # Script producción
├── test-api-gateway.sh               # Script de testing
└── README.md
```

## 🔧 Troubleshooting

### API Gateway no inicia

**Problema:** Puerto 3000 ya está en uso

```bash
# Linux/Mac
lsof -i :3000
kill -9 <PID>

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

**Problema:** Variables de entorno no cargadas

```bash
# Verificar que existe el archivo
ls -la .env.development

# Ver variables cargadas
npm run dev 2>&1 | grep "Entorno cargado"
```

### Servicios no responden

1. Verificar que los microservicios estén corriendo:

```bash
curl http://localhost:3001/health  # Auth
curl http://localhost:3002/health  # User
# ... etc
```

2. Revisar health check del API Gateway:

```bash
curl http://localhost:3000/health | jq '.services'
```

3. Verificar URLs en `.env`:

```bash
cat .env.development | grep SERVICE_URL
```

### Error de CORS

**Síntoma:** `Access-Control-Allow-Origin` error en el navegador

**Solución:**

1. Agregar el origen a `ALLOWED_ORIGINS` en `.env`:

```env
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174,https://tu-frontend.com
```

2. Reiniciar el API Gateway:

```bash
npm run dev
```

### Rate Limiting muy estricto

**Ajustar límites en `.env`:**

```env
# Ventana de 15 minutos, máximo 200 requests
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=200
```

### Logs no se generan

```bash
# Crear directorio de logs
mkdir -p logs

# Verificar permisos
chmod 755 logs

# Verificar LOG_LEVEL
echo $LOG_LEVEL  # Debe ser 'debug' en desarrollo
```

## 📚 Documentación Adicional

### Agregar un nuevo microservicio

1. **Actualizar `src/config/services.config.ts`:**

```typescript
{
  name: "nuevo-servicio",
  url: ENV.NUEVO_SERVICIO_URL,
  path: "/api/nuevo-servicio",
  timeout: 10000,
  requiresAuth: true,
  description: "Descripción del servicio"
}
```

2. **Agregar variable en `.env`:**

```env
NUEVO_SERVICIO_URL=http://localhost:3008
```

3. **Reiniciar API Gateway**

### Personalizar Rate Limiting por ruta

```typescript
// En src/index.ts
import { strictLimiter } from "./middleware/rateLimit.middleware.js";

// Aplicar límite estricto a una ruta específica
app.use("/api/sensitive-endpoint", strictLimiter);
```

### Agregar headers personalizados

```typescript
// En src/config/proxy.config.ts
onProxyReq: (proxyReq, req: any) => {
  proxyReq.setHeader("X-Custom-Header", "valor");
  // ... otros headers
};
```

## 📈 Mejores Prácticas

### Desarrollo

- ✅ Usar `npm run dev` para hot-reload
- ✅ Revisar logs en `logs/combined.log`
- ✅ Probar health check frecuentemente
- ✅ Mantener `.env.development` actualizado
- ✅ Nunca commitear `.env` files

### Producción

- ✅ Usar variables de entorno seguras
- ✅ Habilitar HTTPS
- ✅ Configurar monitoring (New Relic, Datadog)
- ✅ Implementar backup de logs
- ✅ Usar secrets manager (AWS Secrets, Vault)
- ✅ Configurar alertas de health check
- ✅ Rate limiting más estricto
- ✅ LOG_LEVEL=info o warn

## 📝 Variables de Entorno

| Variable                | Descripción                | Requerida | Default        | Ejemplo                               |
| ----------------------- | -------------------------- | --------- | -------------- | ------------------------------------- |
| PORT                    | Puerto del API Gateway     | No        | 3000           | 3000                                  |
| NODE_ENV                | Entorno de ejecución       | Sí        | development    | production                            |
| JWT_SECRET              | Secret para JWT            | Sí        | -              | strong-secret-123                     |
| JWT_EXPIRES_IN          | Tiempo de expiración JWT   | No        | 7d             | 24h                                   |
| JWT_REFRESH_SECRET      | Secret para refresh token  | Sí        | -              | refresh-secret-456                    |
| FRONTEND_URL            | URL del frontend           | No        | localhost:5173 | https://app.com                       |
| ALLOWED_ORIGINS         | Orígenes CORS permitidos   | Sí        | localhost:5173 | https://app.com,https://admin.app.com |
| AUTH_SERVICE_URL        | URL del auth service       | Sí        | localhost:3001 | https://auth.app.com                  |
| USER_SERVICE_URL        | URL del user service       | Sí        | localhost:3002 | https://user.app.com                  |
| RATE_LIMIT_WINDOW_MS    | Ventana de rate limiting   | No        | 900000         | 600000                                |
| RATE_LIMIT_MAX_REQUESTS | Máximo de requests         | No        | 100            | 200                                   |
| LOG_LEVEL               | Nivel de logging           | No        | info           | debug                                 |
| HEALTH_CHECK_INTERVAL   | Intervalo de health checks | No        | 30000          | 60000                                 |
| PROXY_TIMEOUT           | Timeout de proxy           | No        | 30000          | 45000                                 |

## 🤝 Contribución

1. Fork el proyecto
2. Crea tu feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

MIT License - ver archivo LICENSE para más detalles

## 👥 Equipo

HealthBridge Team - Sistema de Gestión Médica

Para más información o soporte, contacta al equipo de desarrollo.

---

**🎉 ¡API Gateway completo y listo para usar!**

Si tienes alguna pregunta o problema, revisa la sección de Troubleshooting o contacta al equipo.
