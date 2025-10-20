# HealthBridge Billing Service

## 🏥 Servicio de Facturación y Pagos

Microservicio de facturación y procesamiento de pagos para la plataforma HealthBridge.

### ✨ Características

- ✅ Facturación automática de citas médicas
- ✅ Procesamiento de pagos con Stripe
- ✅ Soporte para múltiples métodos de pago (Stripe, Efectivo, Transferencia, QR)
- ✅ Manejo de seguros médicos y copagos
- ✅ Pagos parciales y completos
- ✅ Sistema de reembolsos
- ✅ Generación de PDF de facturas
- ✅ Envío de facturas por email
- ✅ Reportes financieros detallados
- ✅ Auditoría completa de transacciones

### 🚀 Instalación

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.development .env

# Ejecutar en modo desarrollo
npm run dev

# Compilar para producción
npm run build

# Ejecutar en producción
npm start
```

### 📦 Dependencias Principales

- **Express**: Framework web
- **Mongoose**: ODM para MongoDB
- **Stripe**: Procesamiento de pagos
- **PDFKit**: Generación de PDFs
- **Winston**: Logging
- **JWT**: Autenticación

### 🔧 Configuración

El servicio requiere las siguientes variables de entorno:

```env
PORT=3006
MONGODB_URI=mongodb://localhost:27017/healthbridge_billing
STRIPE_SECRET_KEY=tu_clave_secreta_stripe
JWT_SECRET=tu_secreto_jwt
```

### 📡 API Endpoints

#### Facturas
- `POST /api/invoices` - Crear factura
- `GET /api/invoices` - Listar facturas
- `GET /api/invoices/:id` - Obtener factura
- `PUT /api/invoices/:id` - Actualizar factura
- `DELETE /api/invoices/:id` - Cancelar factura
- `GET /api/invoices/:id/pdf` - Descargar PDF

#### Pagos
- `POST /api/payments/invoice/:invoiceId` - Crear pago
- `POST /api/payments/stripe/:invoiceId` - Pagar con Stripe
- `POST /api/payments/:paymentId/refund` - Crear reembolso
- `GET /api/payments/:id` - Obtener pago
- `GET /api/payments` - Listar pagos

#### Reportes
- `GET /api/reports/financial` - Reporte financiero
- `GET /api/reports/patient/:patientId` - Historial de paciente
- `GET /api/reports/doctor/:doctorId` - Ingresos por doctor
- `GET /api/reports/pending` - Cuentas por cobrar

### 🏗️ Arquitectura

```
billing-service/
├── src/
│   ├── config/          # Configuración
│   ├── models/          # Modelos de datos
│   ├── services/        # Lógica de negocio
│   ├── controllers/     # Controladores
│   ├── routes/          # Rutas API
│   ├── middleware/      # Middlewares
│   └── utils/           # Utilidades
├── dist/                # Código compilado
└── logs/                # Archivos de log
```

### 🔒 Seguridad

- Autenticación JWT
- Validación de datos con express-validator
- Rate limiting
- CORS configurado
- Helmet para headers de seguridad

### 📊 Modelos de Datos

#### Invoice (Factura)
- Información de paciente, doctor, facility
- Items de factura con cantidades y precios
- Descuentos e información de seguros
- Estados: draft, issued, paid, overdue, cancelled

#### Payment (Pago)
- Relacionado con factura
- Método de pago y detalles
- Estados: pending, completed, failed, refunded
- Soporte para reembolsos parciales

#### Transaction (Transacción)
- Registro de auditoría
- Tipos: payment, refund, adjustment
- Trazabilidad completa

### 🧪 Testing

```bash
npm run test
npm run test:watch
```

### 🐳 Docker

```bash
# Desarrollo
npm run docker:dev

# Producción
npm run docker:prod
```

### 📝 Licencia

MIT

### 👥 Equipo

HealthBridge Team
