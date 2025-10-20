# 💳 HealthBridge Subscription Service - README Completo

Servicio de suscripciones y facturación con modelo Freemium para HealthBridge. Gestiona planes, pagos con Stripe, y control de límites de uso.

# 🎯 Modelo de Negocio Freemium

## 📊 Planes Disponibles

### 🆓 BASIC (Gratuito)

Precio: Bs. 0/mes

✅ 2 citas por mes
✅ 100MB de almacenamiento
✅ 1 archivo por registro médico
✅ Historial médico básico
✅ Notificaciones por email
✅ Soporte por email (respuesta en 48h)
❌ Sin telemedicina
❌ Sin acceso API
❌ Sin prioridad

Ideal para: Pacientes ocasionales, prueba del sistema

### ⭐ PREMIUM (Bs. 50/mes)

Precio: Bs. 50/mes (~$7 USD)

✅ 10 citas por mes
✅ 500MB de almacenamiento
✅ 5 archivos por registro
✅ Teleconsultas básicas
✅ Recordatorios SMS
✅ Exportar informes PDF
✅ Notificaciones push
✅ Soporte prioritario (respuesta en 24h)
✅ Historial completo
❌ Sin API access
❌ Sin multi-clínica

Ideal para: Pacientes regulares, familias pequeñas

### 💎 ENTERPRISE (Bs. 120/mes)

Precio: Bs. 120/mes (~$17 USD)

✅ Citas ilimitadas
✅ Almacenamiento ilimitado
✅ Archivos ilimitados
✅ Teleconsultas premium (HD, grabación)
✅ API completa con documentación
✅ Multi-clínica (gestión de múltiples centros)
✅ Reportes avanzados y analytics
✅ Soporte 24/7 con atención inmediata
✅ Branding personalizado
✅ Webhooks personalizados
✅ Exportación masiva de datos
✅ Integraciones con sistemas externos

Ideal para: Clínicas, hospitales, organizaciones médicas

# 📈 Comparativa Rápida

FeatureBASICPREMIUMENTERPRISEPrecioGratisBs. 50/mesBs. 120/mesCitas/mes210♾️ IlimitadasStorage100MB500MB♾️ IlimitadoArchivos/registro15♾️ IlimitadosTelemedicina❌✅ Básica✅ PremiumNotificacionesEmailEmail + SMSTodo + PushAPI Access❌❌✅ CompletoMulti-clínica❌❌✅SoporteEmail 48hPrioritario 24h24/7Exportar PDF❌✅✅Analytics❌❌✅ AvanzadoBranding❌❌✅

# 📋 Requisitos

Node.js 18+
MongoDB 5+
Stripe Account (para procesar pagos)
npm 9+

# 🚀 Instalación Rápida

# 1. Navegar al directorio

cd backend/subscription-service

# 2. Dar permisos a scripts (Linux/Mac)

chmod +x setup.sh start-dev.sh start-prod.sh test-service.sh

# 3. Ejecutar setup

./setup.sh

# 4. Configurar Stripe (ver sección siguiente)

# 5. Iniciar servicio

./start-dev.sh
Para Windows:
bashnpm install
npm run build
npm run dev
⚙️ Configuración

1. Variables de Entorno
   El servicio usa diferentes archivos .env según el entorno:
   .env.development - Desarrollo local:
   env# Server
   PORT=3007
   NODE_ENV=development

# MongoDB

MONGODB_URI=mongodb://localhost:27017/healthbridge-subscriptions

# JWT (debe coincidir con auth-service)

JWT_SECRET=dev-jwt-secret-key-change-in-production-f8a9b2c3d4e5

# Stripe (Test Mode)

STRIPE_SECRET_KEY=sk_test_51ABC...
STRIPE_PUBLISHABLE_KEY=pk_test_51ABC...
STRIPE_WEBHOOK_SECRET=whsec_123...

# Precios (en Bolivianos)

PREMIUM_PRICE=50
ENTERPRISE_PRICE=120

# URLs de servicios

GATEWAY_URL=http://localhost:3000
NOTIFICATION_SERVICE_URL=http://localhost:3005

# Cron Jobs

ENABLE*CRON_JOBS=true
.env.production - Producción:
envPORT=3007
NODE_ENV=production
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/healthbridge-subscriptions
JWT_SECRET=CHANGE-THIS-IN-PRODUCTION
STRIPE_SECRET_KEY=sk_live_51ABC...
STRIPE_WEBHOOK_SECRET=whsec_live*...
PREMIUM_PRICE=50
ENTERPRISE_PRICE=120
ENABLE_CRON_JOBS=true 2. Configurar Stripe
Paso 1: Crear Cuenta en Stripe

Ir a stripe.com y crear cuenta
Activar "Test Mode" (interruptor en la esquina superior derecha)
Ir a Developers > API Keys
Copiar:

Publishable key (empieza con pk*test*)
Secret key (empieza con sk*test*)

Paso 2: Configurar Webhook

Ir a Developers > Webhooks
Click en Add endpoint
Endpoint URL: https://tu-dominio.com/api/subscription/webhook

En desarrollo local usar ngrok: https://abc123.ngrok.io/api/subscription/webhook

Events to send: Seleccionar:

payment_intent.succeeded
payment_intent.payment_failed
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted

Copiar el Signing secret (empieza con whsec\_)

Paso 3: Actualizar .env
envSTRIPE_SECRET_KEY=sk_test_tu_key_aqui
STRIPE_PUBLISHABLE_KEY=pk_test_tu_key_aqui
STRIPE_WEBHOOK_SECRET=whsec_tu_secret_aqui 3. Configurar MongoDB
Desarrollo local:
bash# Instalar MongoDB

# Mac

brew install mongodb-community

# Ubuntu

sudo apt install mongodb

# Iniciar MongoDB

mongod --dbpath ~/data/db
Producción (MongoDB Atlas):

Crear cuenta en mongodb.com/cloud/atlas
Crear cluster gratuito
Obtener connection string
Actualizar MONGODB_URI en .env.production

🏃 Ejecución
Modo Desarrollo (con hot-reload)
Linux/Mac:
bash./start-dev.sh
Windows:
bashnpm run dev
El servicio iniciará en http://localhost:3007
Modo Producción
Linux/Mac:
bash./start-prod.sh
Windows:
bashnpm run build
npm start
Verificar que está corriendo
bashcurl http://localhost:3007/health
📡 API Endpoints
Planes (Públicos)
Obtener todos los planes
httpGET /api/plans
Respuesta:
json{
"success": true,
"count": 3,
"plans": [
{
"type": "basic",
"name": "Plan Básico",
"price": 0,
"currency": "BOB",
"interval": "month",
"features": {
"maxAppointments": 2,
"maxStorage": 104857600,
"maxFilesPerRecord": 1,
"telemedicine": false,
"apiAccess": false
}
}
// ... más planes
]
}
Obtener plan específico
httpGET /api/plans/:type
Ejemplo:
bashcurl http://localhost:3007/api/plans/premium
Suscripciones (Requieren autenticación)
Obtener mi suscripción actual
httpGET /api/subscription/my-subscription
Authorization: Bearer <token>
Respuesta:
json{
"success": true,
"subscription": {
"userId": "user123",
"plan": {
"type": "premium",
"name": "Plan Premium",
"price": 50
},
"status": "active",
"startDate": "2025-01-01T00:00:00.000Z",
"endDate": "2025-02-01T00:00:00.000Z",
"autoRenew": true,
"paymentMethod": "stripe"
}
}
Crear suscripción
httpPOST /api/subscription
Authorization: Bearer <token>
Content-Type: application/json

{
"planType": "premium",
"paymentMethod": "stripe"
}
Respuesta:
json{
"success": true,
"message": "Suscripción creada exitosamente",
"subscription": { ... },
"stripeClientSecret": "pi_xxx_secret_yyy"
}
Hacer upgrade
httpPOST /api/subscription/upgrade
Authorization: Bearer <token>
Content-Type: application/json

{
"planType": "enterprise"
}
Respuesta:
json{
"success": true,
"message": "Upgrade realizado exitosamente",
"subscription": { ... },
"stripeClientSecret": "pi_xxx_secret_yyy"
}
Hacer downgrade
httpPOST /api/subscription/downgrade
Authorization: Bearer <token>
Content-Type: application/json

{
"planType": "basic"
}
Respuesta:
json{
"success": true,
"message": "Downgrade programado para el final del período actual",
"subscription": { ... }
}
Cancelar suscripción
httpPOST /api/subscription/cancel
Authorization: Bearer <token>
Content-Type: application/json

{
"reason": "No lo uso suficiente",
"feedback": "El servicio es bueno pero..."
}
Respuesta:
json{
"success": true,
"message": "Suscripción cancelada. Tendrás acceso hasta el final del período actual",
"accessUntil": "2025-02-01T00:00:00.000Z"
}
Uso (Tracking de límites)
Obtener uso actual del mes
httpGET /api/usage/current
Authorization: Bearer <token>
Respuesta:
json{
"success": true,
"usage": {
"userId": "user123",
"month": "2025-01",
"appointments": {
"used": 5,
"limit": 10,
"remaining": 5
},
"storage": {
"used": 256000000,
"limit": 524288000,
"remaining": 268288000,
"usedFormatted": "244 MB",
"limitFormatted": "500 MB"
},
"filesPerRecord": {
"used": 3,
"limit": 5,
"remaining": 2
}
}
}
Verificar si puede usar una funcionalidad
httpGET /api/usage/check/appointments
Authorization: Bearer <token>
Respuesta:
json{
"success": true,
"allowed": true,
"used": 5,
"limit": 10,
"remaining": 5
}
Cuando alcanza el límite:
json{
"success": false,
"allowed": false,
"message": "Has alcanzado el límite de citas para tu plan",
"used": 10,
"limit": 10,
"suggestedPlan": "premium"
}
Registrar uso de una funcionalidad
httpPOST /api/usage/track
Authorization: Bearer <token>
Content-Type: application/json

{
"type": "appointment",
"metadata": {
"appointmentId": "appt123"
}
}
Respuesta:
json{
"success": true,
"message": "Uso registrado exitosamente",
"usage": {
"appointments": {
"used": 6,
"limit": 10,
"remaining": 4
}
}
}
Webhook de Stripe
httpPOST /api/subscription/webhook
Stripe-Signature: signature_from_stripe
Content-Type: application/json

{
"type": "payment_intent.succeeded",
"data": { ... }
}
🔗 Integración con Otros Servicios
Ejemplo: Verificar límite antes de crear cita (Appointment Service)
typescript// En tu Appointment Service
import axios from 'axios';

async function createAppointment(userId: string, appointmentData: any) {
// 1. Verificar límite de citas
try {
const response = await axios.get(
'http://localhost:3007/api/usage/check/appointments',
{
headers: {
Authorization: `Bearer ${token}`
}
}
);

    if (!response.data.allowed) {
      return {
        error: 'Has alcanzado el límite de citas de tu plan',
        suggestedPlan: response.data.suggestedPlan,
        currentUsage: response.data.used,
        limit: response.data.limit
      };
    }

} catch (error) {
console.error('Error verificando límite:', error);
throw error;
}

// 2. Crear la cita
const appointment = await Appointment.create(appointmentData);

// 3. Registrar el uso
try {
await axios.post(
'http://localhost:3007/api/usage/track',
{
type: 'appointment',
metadata: {
appointmentId: appointment.\_id
}
},
{
headers: {
Authorization: `Bearer ${token}`
}
}
);
} catch (error) {
console.error('Error registrando uso:', error);
// No fallar la creación de la cita por esto
}

return appointment;
}
Ejemplo: Middleware para proteger rutas por plan
typescript// En cualquier servicio
import axios from 'axios';
import { Request, Response, NextFunction } from 'express';

async function requirePlan(requiredPlan: string) {
return async (req: Request, res: Response, next: NextFunction) => {
try {
const token = req.headers.authorization?.split(' ')[1];

      const response = await axios.get(
        'http://localhost:3007/api/subscription/my-subscription',
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const userPlan = response.data.subscription.plan.type;

      // Definir jerarquía de planes
      const planHierarchy = ['basic', 'premium', 'enterprise'];
      const userPlanLevel = planHierarchy.indexOf(userPlan);
      const requiredPlanLevel = planHierarchy.indexOf(requiredPlan);

      if (userPlanLevel < requiredPlanLevel) {
        return res.status(403).json({
          error: 'Plan insuficiente',
          message: `Esta funcionalidad requiere el plan ${requiredPlan}`,
          currentPlan: userPlan,
          requiredPlan: requiredPlan
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        error: 'Error verificando suscripción'
      });
    }

};
}

// Uso en rutas
app.get('/api/telemedicine', requirePlan('premium'), handleTelemedicine);
app.get('/api/analytics', requirePlan('enterprise'), handleAnalytics);
🧪 Testing
Test Automático
bash./test-service.sh
Tests Manuales con curl
bash# 1. Health check
curl http://localhost:3007/health

# 2. Obtener planes

curl http://localhost:3007/api/plans

# 3. Obtener mi suscripción (necesitas token)

curl -H "Authorization: Bearer <tu-token>" \
 http://localhost:3007/api/subscription/my-subscription

# 4. Ver uso actual

curl -H "Authorization: Bearer <tu-token>" \
 http://localhost:3007/api/usage/current

# 5. Verificar límite de citas

curl -H "Authorization: Bearer <tu-token>" \
 http://localhost:3007/api/usage/check/appointments

# 6. Crear suscripción Premium

curl -X POST http://localhost:3007/api/subscription \
 -H "Authorization: Bearer <tu-token>" \
 -H "Content-Type: application/json" \
 -d '{"planType":"premium","paymentMethod":"stripe"}'
Test de Webhook de Stripe
bash# Usar Stripe CLI
stripe listen --forward-to localhost:3007/api/subscription/webhook

# En otra terminal, simular evento

stripe trigger payment_intent.succeeded
🐳 Docker
Dockerfile
dockerfileFROM node:18-alpine

WORKDIR /app

COPY package\*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3007

CMD ["npm", "start"]
Build y Run
bash# Build
docker build -t healthbridge-subscription .

# Run

docker run -p 3007:3007 \
 -e MONGODB*URI=mongodb://mongo:27017/healthbridge-subscriptions \
 -e STRIPE_SECRET_KEY=sk_test*... \
 --name subscription-service \
 healthbridge-subscription
Docker Compose
yamlversion: '3.8'

services:
subscription-service:
build: ./subscription-service
ports: - "3007:3007"
environment: - NODE_ENV=production - MONGODB_URI=mongodb://mongo:27017/healthbridge-subscriptions - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
      - JWT_SECRET=${JWT_SECRET}
depends_on: - mongo
networks: - healthbridge-network

mongo:
image: mongo:6
volumes: - subscription-data:/data/db
networks: - healthbridge-network

volumes:
subscription-data:

networks:
healthbridge-network:
external: true

```

## 🚀 Despliegue a Producción

### Render.com

1. Crear nuevo **Web Service**
2. Conectar repositorio
3. **Root Directory:** `backend/subscription-service`
4. **Build Command:** `npm install && npm run build`
5. **Start Command:** `npm start`
6. **Environment Variables:**
```

NODE*ENV=production
PORT=3007
MONGODB_URI=mongodb+srv://...
JWT_SECRET=strong-secret
STRIPE_SECRET_KEY=sk_live*...
STRIPE*WEBHOOK_SECRET=whsec*...
PREMIUM_PRICE=50
ENTERPRISE_PRICE=120
Railway.app
bashrailway login
railway init
railway add
railway up
Verificar Deployment
bashcurl https://tu-servicio.onrender.com/health

```

## 📂 Estructura del Proyecto
```

subscription-service/
├── src/
│ ├── config/
│ │ ├── database.ts # Configuración MongoDB
│ │ ├── env.ts # Variables de entorno
│ │ └── stripe.config.ts # Configuración Stripe
│ ├── models/
│ │ ├── Plan.ts # Schema de planes
│ │ ├── Subscription.ts # Schema de suscripciones
│ │ └── UsageTracking.ts # Schema de uso
│ ├── services/
│ │ ├── SubscriptionService.ts # Lógica de suscripciones
│ │ ├── UsageService.ts # Tracking de uso
│ │ └── StripeService.ts # Integración Stripe
│ ├── controllers/
│ │ ├── SubscriptionController.ts
│ │ ├── PlanController.ts
│ │ └── UsageController.ts
│ ├── middleware/
│ │ ├── auth.middleware.ts # Verificación JWT
│ │ ├── checkSubscription.ts # Verificar suscripción activa
│ │ ├── checkFeature.ts # Verificar acceso a feature
│ │ └── checkLimit.ts # Verificar límites
│ ├── routes/
│ │ ├── subscription.routes.ts
│ │ ├── plan.routes.ts
│ │ └── usage.routes.ts
│ ├── jobs/
│ │ └── subscriptionJobs.ts # Cron jobs
│ ├── utils/
│ │ ├── logger.ts # Winston logger
│ │ └── errors.ts # Error handlers
│ └── index.ts # Entrada principal
├── logs/ # Logs del servicio
├── dist/ # Build de producción
├── .env.development # Variables desarrollo
├── .env.production # Variables producción
├── .env.example # Ejemplo de variables
├── package.json
├── tsconfig.json
├── nodemon.json
├── Dockerfile
├── .dockerignore
├── .gitignore
├── setup.sh # Script de instalación
├── start-dev.sh # Script desarrollo
├── start-prod.sh # Script producción
├── test-service.sh # Script de testing
└── README.md
🔧 Troubleshooting
Servicio no inicia
Problema: Puerto 3007 en uso
bash# Linux/Mac
lsof -i :3007
kill -9 <PID>

# Windows

netstat -ano | findstr :3007
taskkill /PID <PID> /F
Problema: No puede conectar a MongoDB
bash# Verificar que MongoDB está corriendo
mongosh

# Ver URI de conexión

echo $MONGODB_URI

# Verificar credenciales en MongoDB Atlas

Stripe no funciona
Problema: Webhook signature invalid

Verifica que el STRIPE_WEBHOOK_SECRET es correcto
Usa Stripe CLI para testing local: stripe listen --forward-to localhost:3007/api/subscription/webhook

Problema: Payment fails

Verifica que estás en Test Mode en Stripe
Usa tarjetas de prueba de Stripe: 4242 4242 4242 4242

Cron Jobs no se ejecutan
bash# Verificar que está habilitado
echo $ENABLE_CRON_JOBS # Debe ser 'true'

# Ver logs de cron

tail -f logs/combined.log | grep "Cron"
Límites no se aplican correctamente
bash# Verificar uso actual de un usuario
curl -H "Authorization: Bearer <token>" \
 http://localhost:3007/api/usage/current

# Verificar plan del usuario

curl -H "Authorization: Bearer <token>" \
 http://localhost:3007/api/subscription/my-subscription

# Resetear uso (solo desarrollo)

# Eliminar documento en UsageTracking collection

📚 Documentación Adicional
Cambiar precios de planes
Editar src/config/plans.config.ts:
typescriptexport const PLANS = {
premium: {
price: 75, // Cambiar precio
// ... resto
}
};
Actualizar .env:
envPREMIUM_PRICE=75
Agregar nueva funcionalidad con límite

Actualizar modelo de Plan:

typescript// src/models/Plan.ts
features: {
// ... features existentes
maxVideoStorage: { type: Number, default: 0 }
}

Actualizar tracking:

typescript// src/models/UsageTracking.ts
videoStorage: { type: Number, default: 0 }

Agregar verificación:

typescript// src/services/UsageService.ts
async checkVideoStorage(userId: string): Promise<boolean> {
const usage = await this.getCurrentUsage(userId);
const subscription = await Subscription.findOne({ userId });
const limit = subscription.plan.features.maxVideoStorage;
return usage.videoStorage < limit;
}
Personalizar emails de notificación
Editar src/services/SubscriptionService.ts:
typescriptprivate async sendUpgradeEmail(userId: string, plan: string) {
// Personalizar contenido del email
await axios.post(`${NOTIFICATION_SERVICE_URL}/send`, {
to: userEmail,
subject: 'Tu plan se actualizó',
template: 'upgrade',
data: {
planName: plan,
// ... datos personalizados
}
});
}
🎓 Mejores Prácticas
Seguridad

✅ Nunca exponer STRIPE_SECRET_KEY en el frontend
✅ Siempre verificar signature de webhooks de Stripe
✅ Usar HTTPS en producción
✅ Validar todos los inputs
✅ Rate limiting en endpoints sensibles

Performance

✅ Cachear planes (raramente cambian)
✅ Indexar campos frecuentemente consultados en MongoDB
✅ Usar projection en queries para traer solo campos necesarios
✅ Implementar paginación en listados

Escalabilidad

✅ Usar Redis para caché distribuido
✅ Queue para procesar pagos (Bull, BeeQueue)
✅ Separar webhook handler en servicio aparte
✅ Monitorear métricas (New Relic, Datadog)

📊 Monitoreo
Métricas Clave

Tasa de conversión Basic → Premium
Churn rate (cancelaciones)
MRR (Monthly Recurring Revenue)
Uso promedio por plan
Tiempo de respuesta de APIs

Logs Importantes
bash# Ver todos los upgrades
tail -f logs/combined.log | grep "Upgrade"

# Ver pagos fallidos

tail -f logs/combined.log | grep "Payment failed"

# Ver límites alcanzados

tail -f logs/combined.log | grep "Limit reached"
📞 Soporte
Para problemas o preguntas:

Revisar esta documentación
Ver logs en logs/combined.log
Verificar configuración de Stripe
Contactar al equipo de desarrollo

# 📄 Licencia

MIT License

# 👥 Equipo

HealthBridge Team - Sistema de Gestión Médica

✨ Subscription Service completo y listo para producción!
