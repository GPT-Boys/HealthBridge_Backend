import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import nodemailer from 'nodemailer';
import twilio from 'twilio';
import amqp from 'amqplib';
import cron from 'node-cron';
import ENV from './config/env.js';

const app = express();
const PORT = ENV.PORT || 3005;

app.use(helmet());
app.use(cors());
app.use(express.json());

// ✅ Conexión a MongoDB
mongoose.connect(ENV.MONGODB_URI)
  .then(() => console.log('✅ Conectado a MongoDB - Notification Service'))
  .catch(err => console.error('❌ Error conectando a MongoDB:', err));

// ✅ Configuración de email (Nodemailer)
const emailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: ENV.EMAIL_USER,
    pass: ENV.EMAIL_PASSWORD
  }
});

// ✅ Configuración de Twilio
const twilioClient = twilio(
  ENV.TWILIO_ACCOUNT_SID,
  ENV.TWILIO_AUTH_TOKEN
);

let rabbitmqChannel: amqp.Channel;

// ✅ Conexión a RabbitMQ
async function connectRabbitMQ() {
  try {
    const connection = await amqp.connect(ENV.RABBITMQ_URL || 'amqp://localhost');
    rabbitmqChannel = await connection.createChannel();

    await rabbitmqChannel.assertQueue('email_notifications', { durable: true });
    await rabbitmqChannel.assertQueue('sms_notifications', { durable: true });
    await rabbitmqChannel.assertQueue('app_notifications', { durable: true });

    console.log('✅ Conectado a RabbitMQ');
    processEmailQueue();
    processSMSQueue();
    processAppQueue();
  } catch (error) {
    console.error('❌ Error conectando a RabbitMQ:', error);
  }
}
connectRabbitMQ();

// ✅ Modelo de notificaciones
const notificationSchema = new mongoose.Schema({
  recipientId: { type: String, required: true },
  recipientType: { type: String, enum: ['patient', 'doctor', 'admin'], required: true },
  type: { type: String, required: true },
  title: String,
  message: String,
  channels: [{
    type: { type: String, enum: ['email', 'sms', 'app', 'whatsapp'] },
    status: { type: String, enum: ['pending', 'sent', 'delivered', 'failed'], default: 'pending' },
    sentAt: Date,
    error: String
  }],
  data: mongoose.Schema.Types.Mixed,
  priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
  scheduledFor: Date,
  isRead: { type: Boolean, default: false },
  readAt: Date,
  createdAt: { type: Date, default: Date.now }
});

const Notification = mongoose.model('Notification', notificationSchema);

// ✅ Middleware interno
// Note: Allow unauthenticated access to the /health endpoint so health checks
// from the API Gateway can succeed without providing auth headers.
const authMiddleware = (req: any, res: any, next: any) => {
  // Allow public health checks
  if (req.path === '/health' || req.url?.startsWith('/health')) {
    return next();
  }

  const internalKey = req.headers['x-internal-key'];
  if (internalKey === ENV.INTERNAL_API_KEY) {
    req.user = { id: 'system', role: 'system' };
    return next();
  }
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ error: 'Usuario no autenticado' });
  req.user = { id: userId, role: req.headers['x-user-role'] };
  next();
};
app.use(authMiddleware);

// ✅ Rutas principales
app.post('/send', async (req, res) => {
  try {
    const { type, data } = req.body;

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

    return res.json({ message: 'Notificación procesada exitosamente' });
  } catch (error) {
    console.error('Error procesando notificación:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ✅ Funciones base
async function queueNotification(notificationData: any) {
  const notification = new Notification({
    ...notificationData,
    channels: notificationData.channels.map((c: string) => ({ type: c }))
  });
  await notification.save();
  await processNotification(notification);
}

async function processNotification(notification: any) {
  for (const channel of notification.channels) {
    try {
      switch (channel.type) {
        case 'email':
          await rabbitmqChannel.sendToQueue('email_notifications', Buffer.from(JSON.stringify({ id: notification._id })));
          break;
        case 'sms':
          await rabbitmqChannel.sendToQueue('sms_notifications', Buffer.from(JSON.stringify({ id: notification._id })));
          break;
        case 'app':
          await rabbitmqChannel.sendToQueue('app_notifications', Buffer.from(JSON.stringify({ id: notification._id })));
          break;
      }
      channel.status = 'sent';
      channel.sentAt = new Date();
    } catch (err: any) {
      channel.status = 'failed';
      channel.error = err.message;
    }
  }
  await notification.save();
}

// ✅ Procesadores de colas
async function processEmailQueue() {
  await rabbitmqChannel.consume('email_notifications', async (msg: any) => {
    if (!msg) return;
    const { id } = JSON.parse(msg.content.toString());
    const notif = await Notification.findById(id);
    if (notif) await sendEmail(notif);
    rabbitmqChannel.ack(msg);
  });
}

async function processSMSQueue() {
  await rabbitmqChannel.consume('sms_notifications', async (msg: any) => {
    if (!msg) return;
    const { id } = JSON.parse(msg.content.toString());
    const notif = await Notification.findById(id);
    if (notif) await sendSMS(notif);
    rabbitmqChannel.ack(msg);
  });
}

async function processAppQueue() {
  await rabbitmqChannel.consume('app_notifications', async (msg: any) => {
    if (!msg) return;
    const { id } = JSON.parse(msg.content.toString());
    const notif = await Notification.findById(id);
    if (notif) notif.channels.forEach((c: any) => c.status = 'delivered');
    await notif?.save();
    rabbitmqChannel.ack(msg);
  });
}

// ✅ Envío de email y SMS
async function sendEmail(notification: any) {
  const userEmail = await getUserEmail(notification.recipientId);
  if (!userEmail) throw new Error('Email no encontrado');

  await emailTransporter.sendMail({
    from: process.env.EMAIL_FROM || 'noreply@healthbridge.com',
    to: userEmail,
    subject: notification.title,
    html: `<p>${notification.message}</p>`
  });
}

async function sendSMS(notification: any) {
  const userPhone = await getUserPhone(notification.recipientId);
  if (!userPhone) throw new Error('Teléfono no encontrado');

  await twilioClient.messages.create({
    body: `HealthBridge: ${notification.message}`,
    from: process.env.TWILIO_PHONE_NUMBER || '',
    to: userPhone
  });
}

// ✅ Funciones simuladas
async function getUserEmail(_: string): Promise<string> {
  return 'patient@example.com';
}
async function getUserPhone(_: string): Promise<string> {
  return '+59170000000';
}

// ✅ Funciones que faltaban 👇
async function handleAppointmentCreated(data: any) {
  const { patientId, doctorId, appointmentDate } = data;
  await queueNotification({
    recipientId: patientId,
    recipientType: 'patient',
    type: 'appointment_created',
    title: 'Cita médica programada',
    message: `Su cita fue programada para ${new Date(appointmentDate).toLocaleString('es-BO')}`,
    channels: ['email', 'app']
  });
  await queueNotification({
    recipientId: doctorId,
    recipientType: 'doctor',
    type: 'appointment_created',
    title: 'Nueva cita asignada',
    message: `Tiene una nueva cita el ${new Date(appointmentDate).toLocaleString('es-BO')}`,
    channels: ['app']
  });
}

async function handleAppointmentUpdated(data: any) {
  await queueNotification({
    recipientId: data.patientId,
    recipientType: 'patient',
    type: 'appointment_updated',
    title: 'Cita actualizada',
    message: 'Su cita ha sido actualizada con nuevos datos.',
    channels: ['email', 'app']
  });
}

async function handleAppointmentCancelled(data: any) {
  await queueNotification({
    recipientId: data.patientId,
    recipientType: 'patient',
    type: 'appointment_cancelled',
    title: 'Cita cancelada',
    message: 'Su cita ha sido cancelada. Por favor contacte a la clínica.',
    channels: ['email', 'app', 'sms']
  });
}

async function handleAppointmentReminder(data: any) {
  await queueNotification({
    recipientId: data.patientId,
    recipientType: 'patient',
    type: 'appointment_reminder',
    title: 'Recordatorio de cita',
    message: `Recuerde su cita el ${new Date(data.appointmentDate).toLocaleString('es-BO')}`,
    channels: ['email', 'sms', 'app']
  });
}

// ✅ Health check
app.get('/health', (_req, res) => {
  res.json({ service: 'notification-service', status: 'OK', time: new Date() });
});

// ✅ Cron Job
cron.schedule('0 * * * *', () => console.log('⏰ Ejecutando cron job de recordatorios...'));

app.listen(PORT, () => console.log(`🔔 Notification Service corriendo en puerto ${PORT}`));
