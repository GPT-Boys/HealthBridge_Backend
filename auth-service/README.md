# 🔐 HealthBridge Auth Service

Servicio de autenticación para HealthBridge - Sistema de Gestión Médica.

## 📋 Características

- ✅ Registro de usuarios (Admin, Doctor, Paciente)
- ✅ Login con JWT (Access Token + Refresh Token)
- ✅ Protección contra fuerza bruta
- ✅ Validación robusta de datos
- ✅ Logging completo con Winston
- ✅ Rate limiting
- ✅ Seguridad con Helmet
- ✅ CORS configurado
- ✅ TypeScript
- ✅ Arquitectura limpia

## 🚀 Instalación

```bash
# Clonar el repositorio
cd auth-service

# Instalar dependencias
npm install

# Copiar variables de entorno
cp .env.example .env

# Editar .env con tus configuraciones
nano .env
```

## ⚙️ Configuración

Edita el archivo `.env` con tus valores:

```env
PORT=3001
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/healthbridge-auth
JWT_SECRET=tu-secreto-super-seguro-cambialo
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=12
```

## 🏃‍♂️ Ejecución

```bash
# Desarrollo
npm run dev

# Producción
npm run build
npm start

# Limpiar y reconstruir
npm run rebuild
```

## 📡 API Endpoints

### Públicos

- `POST /api/auth/register` - Registrar usuario
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/refresh-token` - Renovar token
- `POST /api/auth/verify-token` - Verificar token
- `GET /api/auth/health` - Health check

### Protegidos (requieren token)

- `POST /api/auth/logout` - Cerrar sesión
- `POST /api/auth/logout-all` - Cerrar todas las sesiones
- `GET /api/auth/profile` - Obtener perfil

## 📝 Ejemplos de Uso

### Registro

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "doctor@healthbridge.bo",
    "password": "Password123!",
    "firstName": "Juan",
    "lastName": "Pérez",
    "role": "doctor",
    "profile": {
      "phone": "+59171234567",
      "specialization": "Cardiología",
      "licenseNumber": "MED-12345"
    }
  }'
```

### Login

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "doctor@healthbridge.bo",
    "password": "Password123!"
  }'
```

## 🔒 Seguridad

- Contraseñas hasheadas con bcrypt (12 rounds)
- JWT con expiración
- Rate limiting (5 intentos de login cada 15min)
- Bloqueo de cuenta tras 5 intentos fallidos
- Refresh tokens con rotación
- Headers de seguridad con Helmet
- Validación estricta de entrada

## 📊 Estructura del Proyecto

```
auth-service/
├── src/
│   ├── config/          # Configuraciones
│   ├── controllers/     # Controladores
│   ├── middleware/      # Middleware
│   ├── models/          # Modelos de Mongoose
│   ├── routes/          # Rutas
│   ├── services/        # Lógica de negocio
│   ├── utils/           # Utilidades
│   └── index.ts         # Punto de entrada
├── logs/                # Archivos de log
├── .env                 # Variables de entorno
└── package.json
```

## 🧪 Testing

```bash
npm test
```

## 📝 Logs

Los logs se guardan en:

- `logs/combined.log` - Todos los logs
- `logs/error.log` - Solo errores

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama (`git checkout -b feature/amazing`)
3. Commit cambios (`git commit -m 'Add amazing feature'`)
4. Push (`git push origin feature/amazing`)
5. Abre un Pull Request

## 📄 Licencia

MIT

---

Desarrollado con ❤️ por el equipo de HealthBridge.
