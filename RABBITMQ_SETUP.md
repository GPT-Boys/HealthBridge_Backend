# 🐰 Configuración de RabbitMQ - HealthBridge

## ✅ Estado: CONFIGURADO Y FUNCIONANDO

---

## 📋 Información de RabbitMQ

### **Puertos y Accesos**
- **Puerto de Mensajería:** `5672` (AMQP)
- **Panel de Administración Web:** `15672` (HTTP)
- **Usuario por defecto:** `guest`
- **Contraseña por defecto:** `guest`

### **URL de Conexión**
```bash
amqp://guest:guest@localhost:5672
```

---

## 🚀 Estado del Servicio

### **Contenedor Docker**
```powershell
# Ver estado
docker ps --filter "name=rabbitmq"

# Ver logs en tiempo real
docker logs rabbitmq -f

# Detener
docker-compose down rabbitmq

# Reiniciar
docker-compose restart rabbitmq
```

**Estado Actual:** ✅ Corriendo en `0.0.0.0:5672` y `0.0.0.0:15672`

---

## 🌐 Panel de Administración Web

### **Acceder al Panel**
1. Abre tu navegador
2. Ve a: **http://localhost:15672**
3. Credenciales:
   - **Usuario:** `guest`
   - **Password:** `guest`

### **Qué puedes hacer en el panel:**
- 📊 Ver estadísticas en tiempo real
- 📬 Monitorear colas de mensajes
- 🔍 Ver mensajes en las colas
- ⚙️ Crear/eliminar colas y exchanges
- 👥 Gestionar usuarios y permisos
- 📈 Ver gráficos de rendimiento

---

## 📬 Colas Configuradas en el Notification Service

El `notification-service` crea automáticamente 3 colas al iniciar:

| Cola | Descripción | Uso |
|------|-------------|-----|
| `email_notifications` | Cola de emails | Procesa envío de correos electrónicos |
| `sms_notifications` | Cola de SMS | Procesa envío de mensajes de texto |
| `app_notifications` | Cola de notificaciones | Notificaciones in-app |

**Características:**
- ✅ `durable: true` - Las colas sobreviven a reinicios
- ✅ Procesamiento asíncrono
- ✅ Retry automático en caso de fallo

---

## 🔄 Flujo de Mensajes

```
┌─────────────────────────────────────────────────────────────┐
│  Evento en la Aplicación                                    │
│  (ej: Cita creada, Cita cancelada, Recordatorio)           │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  Notification Service recibe request                        │
│  POST /send                                                 │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  Crear Notificación en MongoDB                              │
│  (recipientId, type, message, channels)                     │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  Publicar mensajes en colas de RabbitMQ                     │
│  ├─ email_notifications                                     │
│  ├─ sms_notifications                                       │
│  └─ app_notifications                                       │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  Consumers procesan las colas (asíncrono)                   │
│  ├─ processEmailQueue() → Envía email con Nodemailer       │
│  ├─ processSMSQueue() → Envía SMS con Twilio               │
│  └─ processAppQueue() → Marca como entregado               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧪 Verificar la Configuración

### **1. Verificar que RabbitMQ está corriendo**
```powershell
docker ps --filter "name=rabbitmq"
```

**Respuesta esperada:**
```
CONTAINER ID   IMAGE                   STATUS         PORTS
ff2afaf0f3fd   rabbitmq:3-management   Up X minutes   0.0.0.0:5672->5672/tcp, 0.0.0.0:15672->15672/tcp
```

### **2. Verificar conectividad desde PowerShell**
```powershell
Test-NetConnection localhost -Port 5672
Test-NetConnection localhost -Port 15672
```

**Respuesta esperada:**
```
TcpTestSucceeded : True
```

### **3. Acceder al panel web**
```powershell
# Abrir en el navegador
start http://localhost:15672
```

### **4. Ver logs de RabbitMQ**
```powershell
docker logs rabbitmq --tail 50
```

---

## 🚀 Iniciar el Notification Service

Ahora que RabbitMQ está configurado, puedes iniciar el servicio:

### **Opción 1: Modo Desarrollo (Recomendado)**
```powershell
cd notification-service
npm install
npm run dev
```

**Salida esperada:**
```
✅ Conectado a MongoDB - Notification Service
✅ Conectado a RabbitMQ
🔔 Notification Service corriendo en puerto 3005
```

### **Opción 2: Con Docker**
```powershell
docker-compose up notification-service -d
```

---

## 🔍 Monitorear las Colas

### **Desde el Panel Web (http://localhost:15672)**
1. Ir a la pestaña **"Queues and Streams"**
2. Deberías ver las 3 colas creadas:
   - `email_notifications`
   - `sms_notifications`
   - `app_notifications`

### **Desde la línea de comandos**
```powershell
# Listar todas las colas
docker exec rabbitmq rabbitmqctl list_queues

# Ver detalles de una cola específica
docker exec rabbitmq rabbitmqctl list_queues name messages consumers

# Ver conexiones activas
docker exec rabbitmq rabbitmqctl list_connections
```

---

## 🧪 Probar el Sistema

### **1. Health Check del Notification Service**
```powershell
curl http://localhost:3005/health
```

**Respuesta esperada:**
```json
{
  "service": "notification-service",
  "status": "OK",
  "time": "2025-10-23T..."
}
```

### **2. Enviar una notificación de prueba**
```powershell
curl -X POST http://localhost:3005/send `
  -H "x-internal-key: internal-secret-key-dev" `
  -H "Content-Type: application/json" `
  -d '{
    "type": "appointment_created",
    "data": {
      "patientId": "test-patient-123",
      "doctorId": "test-doctor-456",
      "appointmentDate": "2025-10-25T10:00:00"
    }
  }'
```

**Respuesta esperada:**
```json
{
  "message": "Notificación procesada exitosamente"
}
```

### **3. Verificar en el Panel de RabbitMQ**
1. Ve a http://localhost:15672
2. Clic en "Queues and Streams"
3. Deberías ver mensajes en las colas (columna "Ready" o "Unacked")

---

## 🎯 Tipos de Notificaciones Soportadas

El servicio maneja estos tipos de notificaciones:

| Tipo | Evento | Canales |
|------|--------|---------|
| `appointment_created` | Nueva cita creada | email, app |
| `appointment_updated` | Cita actualizada | email, app |
| `appointment_cancelled` | Cita cancelada | email, app, sms |
| `appointment_reminder` | Recordatorio de cita | email, app, sms |

---

## ⚙️ Configuración Avanzada

### **Cambiar credenciales de RabbitMQ (Producción)**

Para producción, debes cambiar las credenciales por defecto:

```powershell
# 1. Acceder al contenedor
docker exec -it rabbitmq bash

# 2. Crear nuevo usuario
rabbitmqctl add_user admin password123

# 3. Dar permisos de administrador
rabbitmqctl set_user_tags admin administrator
rabbitmqctl set_permissions -p / admin ".*" ".*" ".*"

# 4. (Opcional) Eliminar usuario guest
rabbitmqctl delete_user guest
```

Luego actualiza el `.env`:
```bash
RABBITMQ_URL=amqp://admin:password123@localhost:5672
```

### **Configurar variables de entorno en Docker Compose**

Edita `docker-compose.yml`:
```yaml
rabbitmq:
  image: rabbitmq:3-management
  environment:
    RABBITMQ_DEFAULT_USER: admin
    RABBITMQ_DEFAULT_PASS: your-secure-password
  ports:
    - "5672:5672"
    - "15672:15672"
```

---

## 🔧 Solución de Problemas

### **Problema: No puedo conectarme a RabbitMQ**

**Síntomas:**
```
❌ Error conectando a RabbitMQ: connect ECONNREFUSED 127.0.0.1:5672
```

**Soluciones:**
1. Verificar que el contenedor está corriendo:
   ```powershell
   docker ps --filter "name=rabbitmq"
   ```

2. Verificar logs:
   ```powershell
   docker logs rabbitmq
   ```

3. Reiniciar RabbitMQ:
   ```powershell
   docker-compose restart rabbitmq
   ```

4. Verificar que el puerto no está siendo usado:
   ```powershell
   netstat -ano | findstr :5672
   ```

### **Problema: No puedo acceder al panel web (15672)**

**Soluciones:**
1. Verificar que el plugin de management está habilitado:
   ```powershell
   docker exec rabbitmq rabbitmq-plugins list
   ```

2. Si no está habilitado, habilitarlo:
   ```powershell
   docker exec rabbitmq rabbitmq-plugins enable rabbitmq_management
   ```

3. Esperar 30 segundos y reintentar: http://localhost:15672

### **Problema: Las colas no se crean**

**Soluciones:**
1. Verificar que el notification-service está corriendo
2. Revisar logs del servicio para ver errores
3. Verificar la conexión desde el código:
   ```typescript
   // El servicio debe mostrar:
   ✅ Conectado a RabbitMQ
   ```

### **Problema: Los mensajes se quedan en la cola**

**Síntomas:** Mensajes en columna "Ready" pero no se procesan

**Soluciones:**
1. Verificar que los consumers estén corriendo
2. Revisar logs del notification-service
3. Verificar que no haya errores en el procesamiento
4. Purgar la cola si es necesario:
   ```powershell
   docker exec rabbitmq rabbitmqctl purge_queue email_notifications
   ```

---

## 📊 Comandos Útiles de RabbitMQ

### **Gestión de Contenedor**
```powershell
# Iniciar
docker-compose up rabbitmq -d

# Detener
docker-compose stop rabbitmq

# Reiniciar
docker-compose restart rabbitmq

# Ver logs en tiempo real
docker logs rabbitmq -f

# Acceder al contenedor
docker exec -it rabbitmq bash
```

### **Comandos rabbitmqctl**
```powershell
# Estado del servidor
docker exec rabbitmq rabbitmqctl status

# Listar usuarios
docker exec rabbitmq rabbitmqctl list_users

# Listar vhosts
docker exec rabbitmq rabbitmqctl list_vhosts

# Listar exchanges
docker exec rabbitmq rabbitmqctl list_exchanges

# Listar bindings
docker exec rabbitmq rabbitmqctl list_bindings

# Estadísticas
docker exec rabbitmq rabbitmqctl eval 'rabbit_diagnostics:maybe_stuck().'
```

### **Gestión de Colas**
```powershell
# Listar todas las colas
docker exec rabbitmq rabbitmqctl list_queues

# Ver cola específica con detalles
docker exec rabbitmq rabbitmqctl list_queues name messages consumers memory

# Purgar una cola (eliminar todos los mensajes)
docker exec rabbitmq rabbitmqctl purge_queue email_notifications

# Eliminar una cola
docker exec rabbitmq rabbitmqctl delete_queue email_notifications
```

---

## 🎯 Resumen de la Configuración

### ✅ **Lo que ya está configurado:**
1. ✅ RabbitMQ corriendo en Docker (puertos 5672 y 15672)
2. ✅ Usuario `guest`/`guest` (por defecto)
3. ✅ Variable de entorno actualizada en `.env.development`
4. ✅ Panel de administración accesible en http://localhost:15672
5. ✅ 3 colas configuradas en el notification-service

### 🚀 **Próximos pasos:**
1. Iniciar el notification-service: `npm run dev`
2. Verificar la conexión en los logs
3. Ver las colas en el panel web
4. Enviar una notificación de prueba
5. Monitorear el procesamiento

---

## 📚 Referencias

- **Documentación oficial:** https://www.rabbitmq.com/documentation.html
- **Management Plugin:** https://www.rabbitmq.com/management.html
- **AMQP Protocol:** https://www.rabbitmq.com/tutorials/amqp-concepts.html
- **Node.js Client (amqplib):** https://amqp-node.github.io/amqplib/

---

**Configurado:** 23 de octubre de 2025  
**Estado:** 🟢 Funcionando correctamente  
**Versión:** RabbitMQ 3 con Management Plugin
