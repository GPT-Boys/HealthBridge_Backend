# 🏗️ Arquitectura HealthBridge Backend

## Diagrama de Arquitectura de Microservicios

```
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│                         FRONTEND (React/Vue)                             │
│                        http://localhost:5173                             │
│                                                                          │
└────────────────────────────────┬─────────────────────────────────────────┘
                                 │
                                 │ HTTP/HTTPS
                                 │ REST API Calls
                                 ↓
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│                      🚪 API GATEWAY (Port 3000)                          │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  • CORS Middleware                                              │   │
│  │  • Helmet Security                                              │   │
│  │  • JWT Authentication (Centralizado)                            │   │
│  │  • Rate Limiting (100 req/15min)                                │   │
│  │  • Request Tracking & Logging                                   │   │
│  │  • Health Checks (cada 30s)                                     │   │
│  │  • Proxy to Microservices                                       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└──┬────┬────┬────┬────┬────┬────┬────────────────────────────────────────┘
   │    │    │    │    │    │    │
   │    │    │    │    │    │    │
   ↓    ↓    ↓    ↓    ↓    ↓    ↓
┌──────────────────────────────────────────────────────────────────────────┐
│                          MICROSERVICIOS                                  │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────┐  ┌─────────────────────┐                      │
│  │  🔐 Auth Service     │  │  👤 User Service     │                      │
│  │  Port: 3001          │  │  Port: 3002          │                      │
│  │  /api/auth           │  │  /api/user           │                      │
│  │                      │  │                      │                      │
│  │  • Login/Register    │  │  • User Profiles     │                      │
│  │  • JWT Generation    │  │  • CRUD Users        │                      │
│  │  • Token Refresh     │  │  • Roles Management  │                      │
│  └─────────────────────┘  └─────────────────────┘                      │
│                                                                          │
│  ┌─────────────────────┐  ┌─────────────────────┐                      │
│  │  📅 Appointment      │  │  📋 Medical Record   │                      │
│  │  Service             │  │  Service             │                      │
│  │  Port: 3003          │  │  Port: 3004          │                      │
│  │  /api/appointment    │  │  /api/medical-record │                      │
│  │                      │  │                      │                      │
│  │  • Schedule Appts    │  │  • Medical History   │                      │
│  │  • Cancel/Update     │  │  • File Management   │                      │
│  │  • Notifications     │  │  • Prescriptions     │                      │
│  └─────────────────────┘  └─────────────────────┘                      │
│                                                                          │
│  ┌─────────────────────┐  ┌─────────────────────┐                      │
│  │  🔔 Notification     │  │  💳 Billing Service  │                      │
│  │  Service             │  │  Port: 3006          │                      │
│  │  Port: 3005          │  │  /api/billing        │                      │
│  │  /api/notification   │  │                      │                      │
│  │                      │  │  • Invoices          │                      │
│  │  • Email             │  │  • Payments          │                      │
│  │  • SMS               │  │  • Stripe Integration│                      │
│  │  • Push Notifications│  │  • Receipts          │                      │
│  └─────────────────────┘  └─────────────────────┘                      │
│                                                                          │
│  ┌─────────────────────┐                                                │
│  │  🎯 Subscription     │                                                │
│  │  Service             │                                                │
│  │  Port: 3007          │                                                │
│  │  /api/subscription   │                                                │
│  │                      │                                                │
│  │  • Plans Management  │                                                │
│  │  • Freemium Model    │                                                │
│  │  • Subscriptions     │                                                │
│  │  • Stripe Integration│                                                │
│  └─────────────────────┘                                                │
│                                                                          │
└──┬────────────────────┬──────────────────────┬──────────────────────────┘
   │                    │                      │
   │                    │                      │
   ↓                    ↓                      ↓
┌──────────────────────────────────────────────────────────────────────────┐
│                           DATA LAYER                                     │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     🍃 MongoDB Atlas                             │   │
│  │                                                                  │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │   │
│  │  │ healthbridge │  │ healthbridge │  │ healthbridge │         │   │
│  │  │    _auth     │  │    _user     │  │ _appointment │  ...    │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘         │   │
│  │                                                                  │   │
│  │  Connection String:                                             │   │
│  │  mongodb+srv://osquimenacho2002_db_user:***@healthbridge...    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     🐰 RabbitMQ (Port 5672)                      │   │
│  │                 Management UI: Port 15672                        │   │
│  │                                                                  │   │
│  │  • Message Queue para eventos asíncronos                        │   │
│  │  • Notificaciones entre servicios                               │   │
│  │  • Event-driven architecture                                    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Flujo de Comunicación Detallado

### 1️⃣ Autenticación (Login)
```
Frontend → API Gateway → Auth Service → MongoDB
                ↓
          JWT Token generado
                ↓
Frontend recibe token
```

### 2️⃣ Request Protegida (ej: obtener perfil)
```
Frontend 
  → Headers: Authorization: Bearer <token>
    ↓
API Gateway
  → Verifica JWT con JWT_SECRET
  → Añade headers: X-User-Id, X-User-Email, X-User-Role
    ↓
User Service
  → Procesa request
  → Accede a MongoDB
    ↓
Response → API Gateway → Frontend
```

### 3️⃣ Crear Cita (Appointment)
```
Frontend → API Gateway → Appointment Service
                              ↓
                        Guarda en MongoDB
                              ↓
                        Publica evento en RabbitMQ
                              ↓
                        Notification Service
                              ↓
                        Envía email/SMS al paciente
```

### 4️⃣ Procesamiento de Pago
```
Frontend → API Gateway → Billing Service
                              ↓
                        Stripe API
                              ↓
                        Guarda invoice en MongoDB
                              ↓
                        Notification Service
                              ↓
                        Envía recibo por email
```

---

## 🔐 Seguridad en Capas

```
┌─────────────────────────────────────────────────────────────┐
│ Capa 1: CORS (Cross-Origin Resource Sharing)               │
│ • Valida origen de la request                               │
│ • Permite: localhost:5173, localhost:3000                   │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ Capa 2: Helmet.js (HTTP Security Headers)                  │
│ • Content Security Policy                                   │
│ • XSS Protection                                            │
│ • HSTS (HTTP Strict Transport Security)                    │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ Capa 3: Rate Limiting                                       │
│ • General: 100 requests / 15 minutos                        │
│ • Auth: 10 intentos / 15 minutos                            │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ Capa 4: JWT Authentication                                  │
│ • Verifica token con JWT_SECRET                             │
│ • Valida expiración                                         │
│ • Extrae userId, email, role                                │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ Capa 5: Role-Based Access Control (RBAC)                   │
│ • Admin: Acceso total                                       │
│ • Doctor: Acceso a pacientes y citas                        │
│ • Paciente: Acceso solo a sus datos                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Monitoring y Observabilidad

### Health Check Hierarchy
```
API Gateway (/health)
    ├─ Auth Service (3001/health) ──────┐
    ├─ User Service (3002/health) ──────┤
    ├─ Appointment (3003/health) ───────┤
    ├─ Medical Record (3004/health) ────┼─→ Overall Status
    ├─ Notification (3005/health) ──────┤   • healthy
    ├─ Billing (3006/health) ───────────┤   • degraded
    └─ Subscription (3007/health) ──────┘   • unhealthy
```

### Logging Strategy
```
┌──────────────────────────────────────────────────────────┐
│ Winston Logger (API Gateway)                             │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  combined-YYYY-MM-DD.log    →  Todos los logs           │
│  error-YYYY-MM-DD.log       →  Solo errores             │
│  http-YYYY-MM-DD.log        →  HTTP requests            │
│                                                          │
│  Rotación diaria automática                              │
│  Nivel: debug (dev) / info (prod)                       │
└──────────────────────────────────────────────────────────┘
```

---

## 🗄️ Estructura de Base de Datos

```
MongoDB Atlas Cluster: HealthBridge
├─ healthbridge_auth
│  ├─ users (credenciales, hashes)
│  └─ sessions (refresh tokens)
│
├─ healthbridge_user
│  ├─ profiles (datos personales)
│  └─ roles (permisos)
│
├─ healthbridge_appointment
│  ├─ appointments (citas)
│  ├─ schedules (disponibilidad)
│  └─ history (historial)
│
├─ healthbridge_medical_record
│  ├─ records (historiales médicos)
│  ├─ files (documentos)
│  └─ prescriptions (recetas)
│
├─ healthbridge_notification
│  ├─ notifications (notificaciones)
│  ├─ templates (plantillas)
│  └─ logs (registro de envíos)
│
├─ healthbridge_billing
│  ├─ invoices (facturas)
│  ├─ payments (pagos)
│  └─ receipts (recibos)
│
└─ healthbridge_subscription
   ├─ plans (planes: basic, premium, enterprise)
   ├─ subscriptions (suscripciones activas)
   └─ usage (uso y límites)
```

---

## 🚀 Tecnologías Utilizadas

### Backend Stack
- **Runtime:** Node.js 22.x + TypeScript
- **Framework:** Express 5.x
- **Base de Datos:** MongoDB Atlas
- **Message Broker:** RabbitMQ
- **Autenticación:** JWT (jsonwebtoken)
- **Seguridad:** Helmet, CORS, express-rate-limit
- **Logging:** Winston + Morgan
- **Proxy:** http-proxy-middleware
- **Validación:** express-validator
- **Payments:** Stripe API

### DevOps
- **Containerization:** Docker + Docker Compose
- **Process Manager:** Nodemon (dev), PM2 (prod)
- **Environment:** dotenv
- **Package Manager:** npm

---

## 📈 Escalabilidad

### Horizontal Scaling
```
                Load Balancer (nginx)
                        ↓
        ┌───────────────┼───────────────┐
        ↓               ↓               ↓
   Gateway 1       Gateway 2       Gateway 3
        ↓               ↓               ↓
        └───────────────┼───────────────┘
                        ↓
                Microservices Layer
                        ↓
                MongoDB Replica Set
```

### Vertical Scaling
- Incrementar recursos de cada servicio
- Optimizar queries a MongoDB
- Implementar caching con Redis

---

## 🎯 Patrones de Diseño Implementados

1. **API Gateway Pattern** - Punto de entrada único
2. **Microservices Architecture** - Servicios independientes
3. **Circuit Breaker** - (Recomendado implementar)
4. **Event-Driven** - RabbitMQ para eventos
5. **Database per Service** - Cada servicio su BD
6. **CQRS** - (Recomendado para medical records)
7. **Saga Pattern** - (Para transacciones distribuidas)

---

## 📞 URLs de Desarrollo

| Servicio | URL |
|----------|-----|
| Frontend | http://localhost:5173 |
| API Gateway | http://localhost:3000 |
| Auth Service | http://localhost:3001 |
| User Service | http://localhost:3002 |
| Appointment Service | http://localhost:3003 |
| Medical Record Service | http://localhost:3004 |
| Notification Service | http://localhost:3005 |
| Billing Service | http://localhost:3006 |
| Subscription Service | http://localhost:3007 |
| RabbitMQ Management | http://localhost:15672 |
| MongoDB Atlas | mongodb+srv://... |

---

**Última Actualización:** 23 de octubre de 2025  
**Versión:** 1.0.0  
**Mantenido por:** HealthBridge Team
