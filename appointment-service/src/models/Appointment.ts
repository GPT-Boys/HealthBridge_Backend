import mongoose, { Document, Schema, Model } from 'mongoose';

// Enum para estados de citas
export enum AppointmentStatus {
  SCHEDULED = 'scheduled',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
  RESCHEDULED = 'rescheduled'
}

// Enum para tipos de cita
export enum AppointmentType {
  CONSULTATION = 'consultation',
  FOLLOW_UP = 'follow_up',
  CHECKUP = 'checkup',
  EMERGENCY = 'emergency',
  TELECONSULTATION = 'teleconsultation',
  VACCINATION = 'vaccination',
  SURGERY = 'surgery',
  THERAPY = 'therapy'
}

// Interface para la cita
export interface IAppointment extends Document {
  // Información básica
  patientId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  facilityId?: mongoose.Types.ObjectId;
  
  // Fecha y hora
  appointmentDate: Date;
  startTime: Date;
  endTime: Date;
  duration: number; // en minutos
  
  // Información de la cita
  type: AppointmentType;
  status: AppointmentStatus;
  reason: string;
  notes?: string;
  
  // Información médica
  specialization: string;
  department?: string;
  room?: string;
  
  // Configuración
  isVirtual: boolean;
  meetingLink?: string;
  requiresPreparation: boolean;
  preparationInstructions?: string;
  
  // Costos
  baseFee: number;
  insuranceCovered: boolean;
  insuranceProvider?: string;
  finalCost?: number;
  
  // Recordatorios
  remindersSent: Array<{
    type: 'email' | 'sms' | 'whatsapp';
    sentAt: Date;
    status: 'sent' | 'delivered' | 'failed';
  }>;
  
  // Metadata
  createdBy: mongoose.Types.ObjectId;
  cancelledBy?: mongoose.Types.ObjectId;
  cancelledAt?: Date;
  cancellationReason?: string;
  
  // Información de reagendamiento
  originalAppointmentId?: mongoose.Types.ObjectId;
  rescheduledFrom?: Date;
  rescheduledTo?: Date;
  reschedulingReason?: string;
  
  createdAt: Date;
  updatedAt: Date;
  
  // Métodos
  canBeCancelled(): boolean;
  canBeRescheduled(): boolean;
  isUpcoming(): boolean;
  getTimeSlot(): string;
  calculateDuration(): number;
}

const appointmentSchema = new Schema<IAppointment>({
  // Información básica
  patientId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'ID del paciente es obligatorio'],
    index: true,
  },
  doctorId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'ID del doctor es obligatorio'],
    index: true,
  },
  facilityId: {
    type: Schema.Types.ObjectId,
    ref: 'Facility',
    index: true,
  },
  
  // Fecha y hora
  appointmentDate: {
    type: Date,
    required: [true, 'Fecha de la cita es obligatoria'],
    index: true,
  },
  startTime: {
    type: Date,
    required: [true, 'Hora de inicio es obligatoria'],
    index: true,
  },
  endTime: {
    type: Date,
    required: [true, 'Hora de fin es obligatoria'],
  },
  duration: {
    type: Number,
    required: [true, 'Duración es obligatoria'],
    min: [15, 'La duración mínima es 15 minutos'],
    max: [480, 'La duración máxima es 8 horas'],
  },
  
  // Información de la cita
  type: {
    type: String,
    enum: {
      values: Object.values(AppointmentType),
      message: '{VALUE} no es un tipo de cita válido',
    },
    required: [true, 'Tipo de cita es obligatorio'],
    default: AppointmentType.CONSULTATION,
  },
  status: {
    type: String,
    enum: {
      values: Object.values(AppointmentStatus),
      message: '{VALUE} no es un estado válido',
    },
    required: [true, 'Estado de la cita es obligatorio'],
    default: AppointmentStatus.SCHEDULED,
    index: true,
  },
  reason: {
    type: String,
    required: [true, 'Motivo de la cita es obligatorio'],
    trim: true,
    minlength: [5, 'El motivo debe tener al menos 5 caracteres'],
    maxlength: [500, 'El motivo no puede exceder 500 caracteres'],
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Las notas no pueden exceder 1000 caracteres'],
  },
  
  // Información médica
  specialization: {
    type: String,
    required: [true, 'Especialización es obligatoria'],
    trim: true,
    index: true,
  },
  department: {
    type: String,
    trim: true,
  },
  room: {
    type: String,
    trim: true,
  },
  
  // Configuración
  isVirtual: {
    type: Boolean,
    default: false,
    index: true,
  },
  meetingLink: {
    type: String,
    trim: true,
    validate: {
      validator: function(this: IAppointment, value: string) {
        // Si es virtual, debe tener link
        if (this.isVirtual && !value) {
          return false;
        }
        // Si tiene link, debe ser una URL válida
        if (value) {
          try {
            // eslint-disable-next-line no-new
            new globalThis.URL(value);
            return true;
          } catch {
            return false;
          }
        }
        return true;
      },
      message: 'Link de reunión inválido o requerido para citas virtuales',
    },
  },
  requiresPreparation: {
    type: Boolean,
    default: false,
  },
  preparationInstructions: {
    type: String,
    trim: true,
    maxlength: [1000, 'Las instrucciones no pueden exceder 1000 caracteres'],
  },
  
  // Costos
  baseFee: {
    type: Number,
    required: [true, 'Tarifa base es obligatoria'],
    min: [0, 'La tarifa no puede ser negativa'],
  },
  insuranceCovered: {
    type: Boolean,
    default: false,
  },
  insuranceProvider: {
    type: String,
    trim: true,
  },
  finalCost: {
    type: Number,
    min: [0, 'El costo final no puede ser negativo'],
  },
  
  // Recordatorios
  remindersSent: [{
    type: {
      type: String,
      enum: ['email', 'sms', 'whatsapp'],
      required: true,
    },
    sentAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'failed'],
      required: true,
      default: 'sent',
    },
  }],
  
  // Metadata
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Creador de la cita es obligatorio'],
  },
  cancelledBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  cancelledAt: Date,
  cancellationReason: {
    type: String,
    trim: true,
    maxlength: [500, 'El motivo de cancelación no puede exceder 500 caracteres'],
  },
  
  // Información de reagendamiento
  originalAppointmentId: {
    type: Schema.Types.ObjectId,
    ref: 'Appointment',
  },
  rescheduledFrom: Date,
  rescheduledTo: Date,
  reschedulingReason: {
    type: String,
    trim: true,
    maxlength: [500, 'El motivo de reagendamiento no puede exceder 500 caracteres'],
  },
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc: any, ret: any) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
});

// Índices compuestos
appointmentSchema.index({ doctorId: 1, appointmentDate: 1, status: 1 });
appointmentSchema.index({ patientId: 1, appointmentDate: 1 });
appointmentSchema.index({ startTime: 1, endTime: 1, doctorId: 1 });
appointmentSchema.index({ facilityId: 1, appointmentDate: 1 });
appointmentSchema.index({ specialization: 1, appointmentDate: 1 });

// Validación personalizada para evitar conflictos de horarios
appointmentSchema.pre('save', async function(this: IAppointment, next: any) {
  try {
    // Solo validar si es una nueva cita o si cambió el horario
    if (this.isNew || this.isModified('startTime') || this.isModified('endTime') || this.isModified('doctorId')) {
      
      // Verificar conflictos con otras citas del mismo doctor
      const Appointment = this.constructor as Model<IAppointment>;
      const conflictingAppointment = await Appointment.findOne({
        _id: { $ne: this._id },
        doctorId: this.doctorId,
        status: { 
          $in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED, AppointmentStatus.IN_PROGRESS] 
        },
        $or: [
          {
            startTime: { $lt: this.endTime },
            endTime: { $gt: this.startTime }
          }
        ]
      });
      
      if (conflictingAppointment) {
        throw new Error('El doctor ya tiene una cita programada en este horario');
      }
      
      // Verificar que la fecha de inicio sea anterior a la de fin
      if (this.startTime >= this.endTime) {
        throw new Error('La hora de inicio debe ser anterior a la hora de fin');
      }
      
      // Verificar que la cita sea en el futuro (excepto para emergencias)
      if (this.type !== AppointmentType.EMERGENCY && this.startTime <= new Date()) {
        throw new Error('Las citas deben programarse en el futuro');
      }
      
      // Calcular duración automáticamente
      this.duration = Math.round((this.endTime.getTime() - this.startTime.getTime()) / (1000 * 60));
      
      // Establecer fecha de la cita
      this.appointmentDate = new Date(this.startTime.getFullYear(), this.startTime.getMonth(), this.startTime.getDate());
    }
    
    next();
  } catch (error: any) {
    next(error);
  }
});

// Métodos de instancia
appointmentSchema.methods.canBeCancelled = function(): boolean {
  const now = new Date();
  const appointmentTime = new Date(this.startTime);
  const timeDiff = appointmentTime.getTime() - now.getTime();
  const hoursUntilAppointment = timeDiff / (1000 * 60 * 60);
  
  // Puede cancelarse si está programada/confirmada y faltan más de 2 horas
  return (
    [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED].includes(this.status) &&
    hoursUntilAppointment > 2
  );
};

appointmentSchema.methods.canBeRescheduled = function(): boolean {
  const now = new Date();
  const appointmentTime = new Date(this.startTime);
  const timeDiff = appointmentTime.getTime() - now.getTime();
  const hoursUntilAppointment = timeDiff / (1000 * 60 * 60);
  
  // Puede reagendarse si está programada/confirmada y faltan más de 4 horas
  return (
    [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED].includes(this.status) &&
    hoursUntilAppointment > 4
  );
};

appointmentSchema.methods.isUpcoming = function(): boolean {
  const now = new Date();
  const appointmentTime = new Date(this.startTime);
  
  return (
    appointmentTime > now &&
    [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED].includes(this.status)
  );
};

appointmentSchema.methods.getTimeSlot = function(): string {
  const start = this.startTime.toLocaleTimeString('es-BO', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });
  const end = this.endTime.toLocaleTimeString('es-BO', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });
  
  return `${start} - ${end}`;
};

appointmentSchema.methods.calculateDuration = function(): number {
  return Math.round((this.endTime.getTime() - this.startTime.getTime()) / (1000 * 60));
};

export const Appointment = mongoose.model<IAppointment>('Appointment', appointmentSchema);