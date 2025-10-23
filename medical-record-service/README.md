# 📋 Medical Record Service - HealthBridge

Servicio de gestión de historiales médicos para la plataforma HealthBridge.

## 🚀 Características

- **Historiales Médicos Completos**
  - Motivo de consulta
  - Historia de la enfermedad
  - Signos vitales (presión, temperatura, frecuencia cardíaca, etc.)
  - Examen físico
  - Diagnósticos (con código CIE-10)
  - Tratamiento y medicaciones
  - Procedimientos realizados
  - Laboratorios y estudios
  - Seguimiento

- **Gestión de Archivos**
  - Subida de documentos (PDF, imágenes, DICOM)
  - Rayos X, análisis de laboratorio, consentimientos
  - Categorización de archivos
  - Descarga segura
  - Límites de almacenamiento

- **Prescripciones Médicas**
  - Creación de prescripciones
  - Múltiples medicamentos
  - Dosis, frecuencia, duración
  - Firma digital del doctor
  - Estados (activa, completada, cancelada, expirada)
  - Renovaciones controladas

- **Seguridad y Privacidad**
  - Autenticación JWT
  - Control de acceso por roles
  - Registros privados
  - Auditoría de accesos

## 🛠️ Tecnologías

- Node.js + TypeScript
- Express.js
- MongoDB + Mongoose
- Multer (subida de archivos)
- JWT Authentication
- Winston (logging)
- Helmet (seguridad)

## 📦 Instalación

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.development

# Ejecutar en desarrollo
npm run dev

# Compilar para producción
npm run build

# Ejecutar en producción
npm start
```

## 🔧 Variables de Entorno

Ver archivo `.env.example` para la configuración completa.

## 📡 Endpoints

### Registros Médicos

```
POST   /api/records                            - Crear registro
GET    /api/records/patient/:patientId         - Obtener registros del paciente
GET    /api/records/patient/:patientId/stats   - Estadísticas
GET    /api/records/:id                        - Obtener registro específico
PUT    /api/records/:id                        - Actualizar registro
DELETE /api/records/:id                        - Eliminar (solo admin)
```

### Archivos

```
POST   /api/records/:recordId/file              - Subir archivo
GET    /api/records/:recordId/files             - Listar archivos
GET    /api/records/file/:fileId/download       - Descargar archivo
DELETE /api/records/file/:fileId                - Eliminar archivo
```

### Prescripciones

```
POST   /api/prescriptions                       - Crear prescripción
GET    /api/prescriptions/patient/:patientId    - Prescripciones del paciente
GET    /api/prescriptions/:id                   - Obtener prescripción
PUT    /api/prescriptions/:id                   - Actualizar prescripción
POST   /api/prescriptions/:id/cancel            - Cancelar prescripción
```

### Sistema

```
GET    /health    - Health check
GET    /api/info  - Información del servicio
```

## 🔐 Autenticación

Todas las rutas requieren autenticación JWT excepto `/health` y `/`.

**Header requerido:**
```
Authorization: Bearer <token>
```

## 👥 Roles y Permisos

- **Admin**: Acceso completo
- **Doctor**: Crear/editar registros, prescripciones, subir archivos
- **Patient**: Solo ver sus propios registros

## 📊 Modelo de Datos

### Medical Record
```typescript
{
  patientId: string;
  doctorId: string;
  appointmentId?: string;
  date: Date;
  type: 'consultation' | 'diagnosis' | 'treatment' | 'test_result' | 'surgery' | 'emergency' | 'other';
  chiefComplaint: string;
  presentIllness?: string;
  vitals?: {
    bloodPressure?: string;
    heartRate?: number;
    temperature?: number;
    respiratoryRate?: number;
    oxygenSaturation?: number;
    weight?: number;
    height?: number;
    bmi?: number;
  };
  physicalExam?: string;
  diagnoses: [{
    code?: string; // CIE-10
    description: string;
    type: 'principal' | 'secondary' | 'differential';
  }];
  treatment?: string;
  medications?: string[];
  procedures?: string[];
  labTests?: [{
    test: string;
    result?: string;
    date?: Date;
    status: 'ordered' | 'pending' | 'completed';
  }];
  notes?: string;
  followUp?: {
    required: boolean;
    date?: Date;
    notes?: string;
  };
  attachments: string[]; // IDs de FileAttachment
  isPrivate: boolean;
}
```

### Prescription
```typescript
{
  recordId?: string;
  patientId: string;
  doctorId: string;
  date: Date;
  validUntil?: Date;
  medications: [{
    name: string;
    genericName?: string;
    dosage: string;
    frequency: string;
    duration: string;
    route: 'oral' | 'intravenous' | 'intramuscular' | 'topical' | 'subcutaneous' | 'other';
    instructions?: string;
    quantity?: number;
  }];
  diagnosis?: string;
  notes?: string;
  instructions?: string;
  status: 'active' | 'completed' | 'cancelled' | 'expired';
  canRenew: boolean;
  renewalCount: number;
  maxRenewals?: number;
  doctorSignature?: {
    signed: boolean;
    signedAt?: Date;
    licenseNumber?: string;
  };
}
```

### File Attachment
```typescript
{
  recordId: string;
  patientId: string;
  uploadedBy: string;
  originalName: string;
  filename: string;
  filePath: string;
  mimeType: string;
  fileSize: number;
  fileExtension: string;
  category: 'lab_result' | 'imaging' | 'prescription' | 'report' | 'consent' | 'insurance' | 'other';
  description?: string;
  uploadDate: Date;
  isDeleted: boolean;
}
```

## 📝 Ejemplo de Uso

### Crear Registro Médico

```javascript
const response = await fetch('http://localhost:3004/api/records', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    patientId: '123',
    appointmentId: '456',
    type: 'consultation',
    chiefComplaint: 'Dolor de cabeza persistente',
    presentIllness: 'Paciente refiere dolor de cabeza de 3 días de evolución',
    vitals: {
      bloodPressure: '120/80',
      heartRate: 75,
      temperature: 36.5,
      weight: 70,
      height: 170
    },
    diagnoses: [{
      code: 'R51',
      description: 'Cefalea',
      type: 'principal'
    }],
    treatment: 'Reposo y analgésicos',
    medications: ['Paracetamol 500mg cada 8 horas por 3 días'],
    followUp: {
      required: true,
      date: '2025-11-01',
      notes: 'Control en una semana si persisten los síntomas'
    }
  })
});
```

### Subir Archivo

```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('category', 'lab_result');
formData.append('description', 'Análisis de sangre completo');

const response = await fetch('http://localhost:3004/api/records/:recordId/file', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

### Crear Prescripción

```javascript
const response = await fetch('http://localhost:3004/api/prescriptions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    patientId: '123',
    recordId: '789',
    medications: [
      {
        name: 'Amoxicilina',
        genericName: 'Amoxicilina',
        dosage: '500mg',
        frequency: 'cada 8 horas',
        duration: '7 días',
        route: 'oral',
        instructions: 'Tomar con alimentos',
        quantity: 21
      }
    ],
    diagnosis: 'Infección respiratoria',
    instructions: 'Completar el tratamiento aunque se sienta mejor',
    validUntil: '2025-11-30',
    canRenew: false
  })
});
```

## 📄 Licencia

MIT

## 👥 Equipo

HealthBridge Team
