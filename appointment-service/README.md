# HealthBridge Appointment Service

Sistema de gestión de citas médicas para la plataforma HealthBridge. Este microservicio maneja toda la lógica relacionada con la programación, gestión y seguimiento de citas médicas.

## 🚀 Características Principales

### ✨ Funcionalidades Core
- **Programación de Citas**: Sistema completo de reserva de citas médicas
- **Gestión de Horarios**: Configuración flexible de horarios por doctor
- **Validación de Conflictos**: Prevención automática de solapamientos
- **Citas Virtuales**: Soporte para teleconsultas con links de reunión
- **Recordatorios Automáticos**: Sistema de notificaciones programadas
- **Reagendamiento**: Cambio de horarios con validaciones
- **Cancelaciones**: Gestión de cancelaciones con políticas de tiempo

### 🔐 Seguridad y Autorización
- **Autenticación JWT**: Integración con Auth Service
- **Control de Acceso por Rol**: Permisos específicos para admin/doctor/patient
- **Validaciones Robustas**: Validación exhaustiva de datos de entrada
- **Rate Limiting**: Protección contra abuso de API

### 📊 Gestión Avanzada
- **Estados de Cita**: Programada, Confirmada, En Progreso, Completada, Cancelada
- **Tipos de Cita**: Consulta, Seguimiento, Chequeo, Emergencia, etc.
- **Estadísticas**: Reportes y métricas de citas
- **Filtros Avanzados**: Búsqueda por múltiples criterios

## 🛠️ Stack Tecnológico

- **Runtime**: Node.js 18+
- **Lenguaje**: TypeScript
- **Framework**: Express.js
- **Base de Datos**: MongoDB + Mongoose
- **Autenticación**: JWT
- **Validación**: Express-validator
- **Logging**: Winston
- **Scheduling**: Node-cron
- **Seguridad**: Helmet, CORS, Rate Limiting

## 📋 Prerequisitos

- Node.js >= 18.0.0
- MongoDB >= 6.0
- npm >= 9.0.0

## 🚀 Inicio Rápido

### 1. Instalación
```bash
cd appointment-service
npm install
```

### 2. Configuración
```bash
# Copiar archivo de configuración
cp .env.development.example .env.development

# Editar variables de entorno
nano .env.development
```

### 3. Iniciar MongoDB
```bash
# Opción 1: Docker
docker run -d --name mongodb -p 27017:27017 \\
  -e MONGO_INITDB_ROOT_USERNAME=admin \\
  -e MONGO_INITDB_ROOT_PASSWORD=password123 \\
  mongo:7.0

# Opción 2: Sistema local
sudo systemctl start mongod
```

### 4. Ejecutar
```bash
# Desarrollo
npm run dev

# Producción
npm run build
npm start
```

## 📚 API Endpoints

### 🔓 Endpoints Públicos
```
GET /api/appointments/slots/available  # Consultar disponibilidad
GET /health                            # Health check
GET /api/info                          # Información del servicio
```

### 🔐 Endpoints Autenticados

#### Gestión de Citas
```
POST   /api/appointments               # Crear cita
GET    /api/appointments               # Listar citas (con filtros)
GET    /api/appointments/:id           # Obtener cita específica
PUT    /api/appointments/:id           # Actualizar cita
POST   /api/appointments/:id/cancel    # Cancelar cita
POST   /api/appointments/:id/reschedule # Reagendar cita
POST   /api/appointments/:id/confirm   # Confirmar cita (doctor/admin)
```

#### Estadísticas y Reportes
```
GET    /api/appointments/stats         # Estadísticas de citas
```

## 📖 Ejemplos de Uso

### Crear Nueva Cita
```bash
curl -X POST http://localhost:3003/api/appointments \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -d '{
    "patientId": "674d1234567890abcdef1234",
    "doctorId": "674d1234567890abcdef5678",
    "appointmentDate": "2024-12-15",
    "startTime": "2024-12-15T10:00:00.000Z",
    "duration": 30,
    "reason": "Consulta general de seguimiento",
    "specialization": "Medicina General",
    "baseFee": 150,
    "isVirtual": false
  }'
```

### Consultar Slots Disponibles
```bash
curl "http://localhost:3003/api/appointments/slots/available?doctorId=674d1234567890abcdef5678&date=2024-12-15&duration=30"
```

### Listar Citas de un Paciente
```bash
curl "http://localhost:3003/api/appointments?patientId=674d1234567890abcdef1234&status=scheduled,confirmed" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🔧 Configuración

### Variables de Entorno Principales
```bash
# Servidor
NODE_ENV=development
PORT=3003

# Base de Datos
MONGODB_URI=mongodb://localhost:27017/healthbridge_appointments

# JWT
JWT_SECRET=your-super-secret-jwt-key

# Servicios Externos
AUTH_SERVICE_URL=http://localhost:3001
USER_SERVICE_URL=http://localhost:3002
NOTIFICATION_SERVICE_URL=http://localhost:3005

# Configuración de Citas
DEFAULT_APPOINTMENT_DURATION=30
MAX_APPOINTMENTS_PER_DAY=20
APPOINTMENT_REMINDER_HOURS=24,2
```

## 📊 Modelos de Datos

### Appointment (Cita)
```typescript
{
  patientId: ObjectId,
  doctorId: ObjectId,
  facilityId?: ObjectId,
  appointmentDate: Date,
  startTime: Date,
  endTime: Date,
  duration: number,
  type: 'consultation' | 'follow_up' | 'checkup' | ...,
  status: 'scheduled' | 'confirmed' | 'completed' | ...,
  reason: string,
  specialization: string,
  baseFee: number,
  isVirtual: boolean,
  meetingLink?: string,
  notes?: string,
  // ... más campos
}
```

### Schedule (Horario)
```typescript
{
  doctorId: ObjectId,
  title: string,
  weeklyAvailability: [{
    dayOfWeek: 'monday' | 'tuesday' | ...,
    isWorkingDay: boolean,
    timeSlots: [{
      startTime: string, // "09:00"
      endTime: string,   // "17:00"
      isAvailable: boolean
    }]
  }],
  defaultAppointmentDuration: number,
  maxAppointmentsPerDay: number,
  // ... más configuraciones
}
```

## 🤝 Integración con Otros Servicios

### Auth Service
- Validación de tokens JWT
- Verificación de roles y permisos

### User Service
- Información de pacientes y doctores
- Perfiles y especialidades

### Notification Service
- Envío de recordatorios
- Notificaciones de cambios en citas

## 🔄 Estados de Citas

```
scheduled → confirmed → in_progress → completed
    ↓           ↓            ↓
cancelled   cancelled   cancelled
    ↓
no_show (si no se presenta)
```

## 📈 Monitoreo y Logs

### Health Check
```bash
curl http://localhost:3003/health
```

### Logs Estructurados
- Nivel de log configurable
- Rotación automática de archivos
- Logs de requests y errores

## 🧪 Testing

```bash
# Ejecutar tests
npm test

# Tests con coverage
npm run test:coverage

# Tests en modo watch
npm run test:watch
```

## 🐛 Troubleshooting

### Problemas Comunes

1. **MongoDB no conecta**
   ```bash
   # Verificar que MongoDB esté corriendo
   mongosh --eval "db.adminCommand('ismaster')"
   ```

2. **Error de JWT**
   ```bash
   # Verificar que AUTH_SERVICE esté corriendo
   curl http://localhost:3001/health
   ```

3. **Conflictos de horario**
   - Verificar que el doctor tenga horario configurado
   - Revisar que no haya citas superpuestas

## 📝 Desarrollo

### Estructura del Proyecto
```
src/
├── config/          # Configuración (DB, env)
├── controllers/     # Controladores HTTP
├── middleware/      # Middleware personalizado
├── models/          # Modelos de Mongoose
├── routes/          # Definición de rutas
├── services/        # Lógica de negocio
├── utils/           # Utilidades y validadores
└── index.ts         # Punto de entrada
```

### Comandos de Desarrollo
```bash
npm run dev          # Desarrollo con hot reload
npm run build        # Compilar TypeScript
npm run lint         # Linter
npm run format       # Formatear código
```

## 📄 Licencia

MIT License - Ver archivo LICENSE para detalles.

## 🤝 Contribución

1. Fork el proyecto
2. Crear rama de feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abrir Pull Request

---

**HealthBridge Team** - Sistema de Gestión Médica para Bolivia 🇧🇴