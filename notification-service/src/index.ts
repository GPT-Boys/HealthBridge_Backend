import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import twilio from 'twilio';
import amqp from 'amqplib';
import cron from 'node-cron';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3005;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Conectar a MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/healthbridge-notifications')
  .then(() => console.log('✅ Conectado a MongoDB - Notification Service'))
  .catch(err => console.error('❌ Error conectando a MongoDB:', err));

// Configurar servicios externos
const emailTransporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

let rabbitmqChannel: amqp.Channel;

// Conectar a RabbitMQ
async function connectRabbitMQ() {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
    rabbitmqChannel = await connection.createChannel();
    
    // Crear colas
    await rabbitmqChannel.assertQueue('email_notifications', { durable: true });
    await rabbitmqChannel.assertQueue('sms_notifications', { durable: true });
    await rabbitmqChannel.assertQueue('app_notifications', { durable: true });
    
    console.log('✅ Conectado a RabbitMQ');
    
    // Procesar colas
    processEmailQueue();
    processSMSQueue();
    processAppQueue();
    
  } catch (error) {
    console.error('❌ Error conectando a RabbitMQ:', error);
  }
}

connectRabbitMQ();

// Esquemas
const notificationSchema = new mongoose.Schema({
  recipientId: { type: String, required: true },
  recipientType: { type: String, enum: ['patient', 'doctor', 'admin'], required: true },
  type: { 
    type: String, 
    enum: [
      'appointment_reminder', 'appointment_created', 'appointment_updated', 
      'appointment_cancelled', 'prescription_ready', 'lab_results_ready',
      'payment_due', 'payment_received', 'system_alert'
    ], 
    required: true 
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  channels: [{
    type: { type: String, enum: ['email', 'sms', 'app', 'whatsapp'] },
    status: { type: String, enum: ['pending', 'sent', 'delivered', 'failed'], default: 'pending' },
    sentAt: Date,
    error: String
  }],
  data: mongoose.Schema.Types.Mixed, // datos adicionales
  priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
  scheduledFor: Date, // para notificaciones programadas
  isRead: { type: Boolean, default: false },
  readAt: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const templateSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  type: { type: String, required: true },
  subject: { type: String, required: true },
  emailTemplate: String,
  smsTemplate: String,
  appTemplate: String,
  variables: [String], // variables disponibles en el template
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

const Notification = mongoose.model('Notification', notificationSchema);
const Template = mongoose.model('Template', templateSchema);

// DTOs
interface SendNotificationDTO {
  type: string;
  data: any;
}

interface CreateNotificationDTO {
  recipientId: string;
  recipientType: string;
  type: string;
  title: string;
  message: string;
  channels: string[];
  data?: any;
  priority?: string;
  scheduledFor?: string;
}

// Middleware de autenticación
const authMiddleware = (req: any, res: any, next: any) => {
  // Para este servicio, permitimos llamadas internas sin autenticación estricta
  const internalKey = req.headers['x-internal-key'];
  if (internalKey === process.env.INTERNAL_API_KEY) {
    req.user = { id: 'system', role: 'system' };
    return next();
  }

  const userId = req.headers['x-user-id'];
  const userRole = req.headers['x-user-role'];
  
  if (!userId) {
    return res.status(401).json({ error: 'Usuario no autenticado' });
  }
  
  req.user = { id: userId, role: userRole };
  next();
};

app.use(authMiddleware);

// Rutas
app.post('/send', async (req: express.Request, res: express.Response) => {
  try {
    const { type, data }: SendNotificationDTO = req.body;

    // Procesar según el tipo de notificación
    switch (type) {
      case 'appointment_created':
        await handleAppointmentCreated(data);
        break;
      case 'appointment_updated':
        await handleAppointmentUpdated(data);
        break;
      case 'appointment_cancelled':
        await handleAppointmentCancelled(data);
        break;
      case 'appointment_reminder':
        await handleAppointmentReminder(data);
        break;
      default:
        return res.status(400).json({ error: 'Tipo de notificación no válido' });
    }

    res.json({ message: 'Notificación procesada exitosamente' });

  } catch (error) {
    console.error('Error procesando notificación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.post('/notifications', async (req: express.Request, res: express.Response) => {
  try {
    const notificationData: CreateNotificationDTO = req.body;

    const notification = new Notification({
      ...notificationData,
      channels: notificationData.channels.map(channel => ({ type: channel })),
      scheduledFor: notificationData.scheduledFor ? new Date(notificationData.scheduledFor) : undefined
    });

    await notification.save();

    // Enviar inmediatamente o programar
    if (!notification.scheduledFor || notification.scheduledFor <= new Date()) {
      await processNotification(notification);
    }

    res.status(201).json({
      message: 'Notificación creada exitosamente',
      notification
    });

  } catch (error) {
    console.error('Error creando notificación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.get('/notifications', async (req: express.Request, res: express.Response) => {
  try {
    const user = (req as any).user;
    const { isRead, type, page = 1, limit = 20 } = req.query;

    if (user.role === 'system') {
      return res.status(403).json({ error: 'No autorizado' });
    }

    let filter: any = { recipientId: user.id };

    if (isRead !== undefined) filter.isRead = isRead === 'true';
    if (type) filter.type = type;

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Notification.countDocuments(filter);
    const unreadCount = await Notification.countDocuments({ 
      recipientId: user.id, 
      isRead: false 
    });

    res.json({
      notifications,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      },
      unreadCount
    });

  } catch (error) {
    console.error('Error obteniendo notificaciones:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.put('/notifications/:id/read', async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    const notification = await Notification.findOne({ _id: id, recipientId: user.id });
    
    if (!notification) {
      return res.status(404).json({ error: 'Notificación no encontrada' });
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    res.json({ message: 'Notificación marcada como leída' });

  } catch (error) {
    console.error('Error marcando notificación como leída:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Funciones para manejar diferentes tipos de notificaciones
async function handleAppointmentCreated(data: any) {
  const { appointmentId, patientId, doctorId, appointmentDate } = data;

  // Notificar al paciente
  await queueNotification({
    recipientId: patientId,
    recipientType: 'patient',
    type: 'appointment_created',
    title: 'Cita Médica Programada',
    message: `Su cita médica ha sido programada para el ${new Date(appointmentDate).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}`,
    channels: ['email', 'app'],
    data: { appointmentId, appointmentDate }
  });

  // Notificar al doctor
  await queueNotification({
    recipientId: doctorId,
    recipientType: 'doctor',
    type: 'appointment_created',
    title: 'Nueva Cita Programada',
    message: `Se ha programado una nueva cita para el ${new Date(appointmentDate).toLocaleDateString('es-ES')}`,
    channels: ['app'],
    data: { appointmentId, patientId, appointmentDate }
  });
}

async function handleAppointmentUpdated(data: any) {
  const { appointmentId, patientId, doctorId, newStatus } = data;

  const statusMessages: { [key: string]: string } = {
    confirmed: 'Su cita ha sido confirmada',
    cancelled: 'Su cita ha sido cancelada',
    completed: 'Su cita ha sido completada',
    'in-progress': 'Su cita está en progreso'
  };

  await queueNotification({
    recipientId: patientId,
    recipientType: 'patient',
    type: 'appointment_updated',
    title: 'Actualización de Cita',
    message: statusMessages[newStatus] || 'Su cita ha sido actualizada',
    channels: ['email', 'app', 'sms'],
    data: { appointmentId, newStatus }
  });
}

async function handleAppointmentCancelled(data: any) {
  const { appointmentId, patientId, doctorId } = data;

  await queueNotification({
    recipientId: patientId,
    recipientType: 'patient',
    type: 'appointment_cancelled',
    title: 'Cita Cancelada',
    message: 'Su cita médica ha sido cancelada. Por favor contacte a la clínica para reprogramar.',
    channels: ['email', 'app', 'sms'],
    data: { appointmentId }
  });
}

async function handleAppointmentReminder(data: any) {
  const { appointmentId, patientId, appointmentDate } = data;

  await queueNotification({
    recipientId: patientId,
    recipientType: 'patient',
    type: 'appointment_reminder',
    title: 'Recordatorio de Cita',
    message: `Recordatorio: Tiene una cita médica mañana a las ${new Date(appointmentDate).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    })}`,
    channels: ['email', 'sms', 'app'],
    data: { appointmentId, appointmentDate }
  });
}

// Función para encolar notificaciones
async function queueNotification(notificationData: any) {
  const notification = new Notification({
    ...notificationData,
    channels: notificationData.channels.map((channel: string) => ({ type: channel }))
  });

  await notification.save();
  await processNotification(notification);
}

// Procesar notificación
async function processNotification(notification: any) {
  for (const channel of notification.channels) {
    try {
      switch (channel.type) {
        case 'email':
          await rabbitmqChannel.sendToQueue('email_notifications', 
            Buffer.from(JSON.stringify({ notificationId: notification._id, channel: channel._id }))
          );
          break;
        case 'sms':
          await rabbitmqChannel.sendToQueue('sms_notifications', 
            Buffer.from(JSON.stringify({ notificationId: notification._id, channel: channel._id }))
          );
          break;
        case 'app':
          await rabbitmqChannel.sendToQueue('app_notifications', 
            Buffer.from(JSON.stringify({ notificationId: notification._id, channel: channel._id }))
          );
          break;
      }
      
      channel.status = 'sent';
      channel.sentAt = new Date();
      
    } catch (error) {
      console.error(`Error enviando notificación por ${channel.type}:`, error);
      channel.status = 'failed';
      channel.error = error instanceof Error ? error.message : 'Error desconocido';
    }
  }

  await notification.save();
}

// Procesadores de colas
async function processEmailQueue() {
  await rabbitmqChannel.consume('email_notifications', async (message) => {
    if (message) {
      try {
        const { notificationId, channel } = JSON.parse(message.content.toString());
        const notification = await Notification.findById(notificationId);
        
        if (notification) {
          await sendEmail(notification);
          
          const channelObj = notification.channels.id(channel);
          if (channelObj) {
            channelObj.status = 'delivered';
            await notification.save();
          }
        }
        
        rabbitmqChannel.ack(message);
      } catch (error) {
        console.error('Error procesando email:', error);
        rabbitmqChannel.nack(message, false, false);
      }
    }
  });
}

async function processSMSQueue() {
  await rabbitmqChannel.consume('sms_notifications', async (message) => {
    if (message) {
      try {
        const { notificationId, channel } = JSON.parse(message.content.toString());
        const notification = await Notification.findById(notificationId);
        
        if (notification) {
          await sendSMS(notification);
          
          const channelObj = notification.channels.id(channel);
          if (channelObj) {
            channelObj.status = 'delivered';
            await notification.save();
          }
        }
        
        rabbitmqChannel.ack(message);
      } catch (error) {
        console.error('Error procesando SMS:', error);
        rabbitmqChannel.nack(message, false, false);
      }
    }
  });
}

async function processAppQueue() {
  await rabbitmqChannel.consume('app_notifications', async (message) => {
    if (message) {
      try {
        const { notificationId, channel } = JSON.parse(message.content.toString());
        const notification = await Notification.findById(notificationId);
        
        if (notification) {
          // Para notificaciones in-app, solo marcamos como enviado
          const channelObj = notification.channels.id(channel);
          if (channelObj) {
            channelObj.status = 'delivered';
            await notification.save();
          }
        }
        
        rabbitmqChannel.ack(message);
      } catch (error) {
        console.error('Error procesando notificación app:', error);
        rabbitmqChannel.nack(message, false, false);
      }
    }
  });
}

// Enviar email
async function sendEmail(notification: any) {
  // Obtener información del usuario (esto debería venir de user-service)
  const userEmail = await getUserEmail(notification.recipientId);
  
  if (!userEmail) {
    throw new Error('Email del usuario no encontrado');
  }

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'noreply@healthbridge.com',
    to: userEmail,
    subject: notification.title,
    html: generateEmailHTML(notification),
    text: notification.message
  };

  await emailTransporter.sendMail(mailOptions);
}

// Enviar SMS
async function sendSMS(notification: any) {
  // Obtener número de teléfono del usuario
  const userPhone = await getUserPhone(notification.recipientId);
  
  if (!userPhone) {
    throw new Error('Teléfono del usuario no encontrado');
  }

  await twilioClient.messages.create({
    body: `HealthBridge: ${notification.message}`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: userPhone
  });
}

// Generar HTML para email
function generateEmailHTML(notification: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>${notification.title}</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #007bff; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>HealthBridge</h1>
            </div>
            <div class="content">
                <h2>${notification.title}</h2>
                <p>${notification.message}</p>
                ${notification.data && notification.data.appointmentDate ? 
                  `<p><strong>Fecha:</strong> ${new Date(notification.data.appointmentDate).toLocaleDateString('es-ES')}</p>` 
                  : ''
                }
            </div>
            <div class="footer">
                <p>Este es un mensaje automático de HealthBridge. Por favor no responda a este email.</p>
            </div>
        </div>
    </body>
    </html>
  `;
}

// Funciones helper (deberían hacer llamadas a user-service)
async function getUserEmail(userId: string): Promise<string | null> {
  try {
    // En producción, hacer llamada al user-service
    // const response = await axios.get(`${process.env.USER_SERVICE_URL}/users/${userId}`);
    // return response.data.email;
    
    // Por ahora, retornamos un email de prueba
    return 'patient@example.com';
  } catch (error) {
    console.error('Error obteniendo email del usuario:', error);
    return null;
  }
}

async function getUserPhone(userId: string): Promise<string | null> {
  try {
    // En producción, hacer llamada al user-service
    return '+591XXXXXXXX'; // Número de prueba para Bolivia
  } catch (error) {
    console.error('Error obteniendo teléfono del usuario:', error);
    return null;
  }
}

// Cron job para recordatorios de citas (ejecutar cada hora)
cron.schedule('0 * * * *', async () => {
  try {
    // Buscar citas para mañana que necesiten recordatorio
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const endOfTomorrow = new Date(tomorrow);
    endOfTomorrow.setHours(23, 59, 59, 999);

    // Aquí deberías hacer una llamada al appointment-service para obtener las citas
    // Por ahora lo simulamos
    console.log('Ejecutando cron job de recordatorios...');
    
  } catch (error) {
    console.error('Error en cron job de recordatorios:', error);
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    service: 'notification-service', 
    status: 'OK', 
    timestamp: new Date().toISOString() 
  });
});

app.listen(PORT, () => {
  console.log(`🔔 Notification Service corriendo en puerto ${PORT}`);
});