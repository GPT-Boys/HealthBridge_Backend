import mongoose, { Document, Schema } from 'mongoose';

// Enum para días de la semana
export enum DayOfWeek {
  MONDAY = 'monday',
  TUESDAY = 'tuesday',
  WEDNESDAY = 'wednesday',
  THURSDAY = 'thursday',
  FRIDAY = 'friday',
  SATURDAY = 'saturday',
  SUNDAY = 'sunday'
}

export enum AvailabilityType {
  REGULAR = 'regular',
  EXCEPTION = 'exception',
  BLOCKED = 'blocked',
  VACATION = 'vacation',
  EMERGENCY = 'emergency'
}

// Interface para slots de tiempo
interface ITimeSlot {
  startTime: string; // formato HH:mm
  endTime: string;   // formato HH:mm
  isAvailable: boolean;
}

// Interface para disponibilidad diaria
interface IDayAvailability {
  dayOfWeek: DayOfWeek;
  isWorkingDay: boolean;
  timeSlots: ITimeSlot[];
  maxAppointments?: number;
}

// Interface para excepciones de horario
interface IScheduleException {
  date: Date;
  type: AvailabilityType;
  reason: string;
  timeSlots?: ITimeSlot[];
  isFullDay: boolean;
}

// Interface para el horario del doctor
export interface ISchedule extends Document {
  doctorId: mongoose.Types.ObjectId;
  facilityId?: mongoose.Types.ObjectId;
  
  // Configuración general
  title: string;
  description?: string;
  timezone: string;
  
  // Disponibilidad semanal regular
  weeklyAvailability: IDayAvailability[];
  
  // Configuración de citas
  defaultAppointmentDuration: number; // en minutos
  bufferTimeBetweenAppointments: number; // en minutos
  maxAppointmentsPerDay: number;
  allowBookingDaysInAdvance: number; // días
  
  // Excepciones y días especiales
  exceptions: IScheduleException[];
  
  // Configuración de notificaciones
  autoConfirmAppointments: boolean;
  requirePatientConfirmation: boolean;
  reminderSettings: {
    enabled: boolean;
    emailReminder: boolean;
    smsReminder: boolean;
    whatsappReminder: boolean;
    reminderHours: number[];
  };
  
  // Metadata
  isActive: boolean;
  effectiveFrom: Date;
  effectiveUntil?: Date;
  
  createdAt: Date;
  updatedAt: Date;
  
  // Métodos
  isAvailableOnDate(date: Date): boolean;
  getAvailableSlots(date: Date): ITimeSlot[];
  addException(exception: IScheduleException): void;
  removeException(date: Date): void;
}

const timeSlotSchema = new Schema<ITimeSlot>({
  startTime: {
    type: String,
    required: true,
    match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:mm)'],
  },
  endTime: {
    type: String,
    required: true,
    match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:mm)'],
  },
  isAvailable: {
    type: Boolean,
    default: true,
  },
}, { _id: false });

const dayAvailabilitySchema = new Schema<IDayAvailability>({
  dayOfWeek: {
    type: String,
    enum: {
      values: Object.values(DayOfWeek),
      message: '{VALUE} no es un día válido',
    },
    required: true,
  },
  isWorkingDay: {
    type: Boolean,
    default: true,
  },
  timeSlots: [timeSlotSchema],
  maxAppointments: {
    type: Number,
    min: [1, 'Debe permitir al menos 1 cita'],
    max: [50, 'Máximo 50 citas por día'],
  },
}, { _id: false });

const scheduleExceptionSchema = new Schema<IScheduleException>({
  date: {
    type: Date,
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: {
      values: Object.values(AvailabilityType),
      message: '{VALUE} no es un tipo de excepción válido',
    },
    required: true,
  },
  reason: {
    type: String,
    required: true,
    trim: true,
    maxlength: [200, 'La razón no puede exceder 200 caracteres'],
  },
  timeSlots: [timeSlotSchema],
  isFullDay: {
    type: Boolean,
    default: false,
  },
}, { _id: false });

const scheduleSchema = new Schema<ISchedule>({
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
  
  // Configuración general
  title: {
    type: String,
    required: [true, 'Título del horario es obligatorio'],
    trim: true,
    maxlength: [100, 'El título no puede exceder 100 caracteres'],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'La descripción no puede exceder 500 caracteres'],
  },
  timezone: {
    type: String,
    default: 'America/La_Paz',
    required: true,
  },
  
  // Disponibilidad semanal
  weeklyAvailability: [dayAvailabilitySchema],
  
  // Configuración de citas
  defaultAppointmentDuration: {
    type: Number,
    required: true,
    min: [15, 'Duración mínima es 15 minutos'],
    max: [480, 'Duración máxima es 8 horas'],
    default: 30,
  },
  bufferTimeBetweenAppointments: {
    type: Number,
    min: [0, 'El tiempo de buffer no puede ser negativo'],
    max: [60, 'El tiempo de buffer máximo es 60 minutos'],
    default: 5,
  },
  maxAppointmentsPerDay: {
    type: Number,
    required: true,
    min: [1, 'Debe permitir al menos 1 cita por día'],
    max: [50, 'Máximo 50 citas por día'],
    default: 12,
  },
  allowBookingDaysInAdvance: {
    type: Number,
    required: true,
    min: [1, 'Debe permitir reservar con al menos 1 día de anticipación'],
    max: [365, 'Máximo 365 días de anticipación'],
    default: 30,
  },
  
  // Excepciones
  exceptions: [scheduleExceptionSchema],
  
  // Configuración de notificaciones
  autoConfirmAppointments: {
    type: Boolean,
    default: false,
  },
  requirePatientConfirmation: {
    type: Boolean,
    default: true,
  },
  reminderSettings: {
    enabled: {
      type: Boolean,
      default: true,
    },
    emailReminder: {
      type: Boolean,
      default: true,
    },
    smsReminder: {
      type: Boolean,
      default: false,
    },
    whatsappReminder: {
      type: Boolean,
      default: false,
    },
    reminderHours: {
      type: [Number],
      default: [24, 2],
      validate: {
        validator: function(hours: number[]) {
          return hours.every(h => h >= 0 && h <= 168); // máximo una semana
        },
        message: 'Las horas de recordatorio deben estar entre 0 y 168',
      },
    },
  },
  
  // Metadata
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  effectiveFrom: {
    type: Date,
    required: true,
    default: Date.now,
  },
  effectiveUntil: Date,
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

// Validaciones previas al guardado
scheduleSchema.pre('save', function(this: ISchedule, next: any) {
  try {
    // Validar que effectiveFrom sea anterior a effectiveUntil
    if (this.effectiveUntil && this.effectiveFrom >= this.effectiveUntil) {
      throw new Error('La fecha de inicio debe ser anterior a la fecha de fin');
    }
    
    // Validar slots de tiempo en disponibilidad semanal
    for (const day of this.weeklyAvailability) {
      for (const slot of day.timeSlots) {
        if (slot.startTime >= slot.endTime) {
          throw new Error(`Horario inválido en ${day.dayOfWeek}: ${slot.startTime} - ${slot.endTime}`);
        }
      }
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Índices
scheduleSchema.index({ doctorId: 1, isActive: 1 });
scheduleSchema.index({ facilityId: 1, isActive: 1 });
scheduleSchema.index({ effectiveFrom: 1, effectiveUntil: 1 });

// Validaciones previas al guardado
scheduleSchema.pre('save', function(this: ISchedule, next: any) {
  try {
    // Validar que effectiveFrom sea anterior a effectiveUntil
    if (this.effectiveUntil && this.effectiveFrom >= this.effectiveUntil) {
      throw new Error('La fecha de inicio debe ser anterior a la fecha de fin');
    }
    
    // Validar slots de tiempo en disponibilidad semanal
    for (const day of this.weeklyAvailability) {
      if (day.isWorkingDay && day.timeSlots.length === 0) {
        throw new Error(`Debe definir al menos un slot de tiempo para ${day.dayOfWeek}`);
      }
      
      // Validar que los slots no se superpongan
      for (let i = 0; i < day.timeSlots.length - 1; i++) {
        const current = day.timeSlots[i];
        const next = day.timeSlots[i + 1];
        
        if (current && next && current.endTime > next.startTime) {
          throw new Error(`Los slots de tiempo se superponen en ${day.dayOfWeek}`);
        }
      }
    }
    
    next();
  } catch (error: any) {
    next(error);
  }
});

// Métodos de instancia
scheduleSchema.methods.isAvailableOnDate = function(date: Date): boolean {
  const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()];
  
  // Verificar si hay excepciones para esta fecha
  const exception = this.exceptions.find((ex: IScheduleException) => {
    return ex.date.toDateString() === date.toDateString();
  });
  
  if (exception) {
    return exception.type === AvailabilityType.REGULAR && !exception.isFullDay;
  }
  
  // Verificar disponibilidad regular
  const dayAvailability = this.weeklyAvailability.find((day: IDayAvailability) => {
    return day.dayOfWeek === dayOfWeek;
  });
  
  return dayAvailability ? dayAvailability.isWorkingDay : false;
};

scheduleSchema.methods.getAvailableSlots = function(date: Date): ITimeSlot[] {
  const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()];
  
  // Verificar excepciones primero
  const exception = this.exceptions.find((ex: IScheduleException) => {
    return ex.date.toDateString() === date.toDateString();
  });
  
  if (exception) {
    if (exception.type === AvailabilityType.BLOCKED || 
        exception.type === AvailabilityType.VACATION) {
      return [];
    }
    if (exception.timeSlots && exception.timeSlots.length > 0) {
      return exception.timeSlots.filter((slot: ITimeSlot) => slot.isAvailable);
    }
  }
  
  // Obtener slots regulares
  const dayAvailability = this.weeklyAvailability.find((day: IDayAvailability) => {
    return day.dayOfWeek === dayOfWeek;
  });
  
  if (!dayAvailability || !dayAvailability.isWorkingDay) {
    return [];
  }
  
  return dayAvailability.timeSlots.filter((slot: ITimeSlot) => slot.isAvailable);
};

scheduleSchema.methods.addException = function(exception: IScheduleException): void {
  // Remover excepciones existentes para la misma fecha
  this.exceptions = this.exceptions.filter((ex: IScheduleException) => {
    return ex.date.toDateString() !== exception.date.toDateString();
  });
  
  // Agregar nueva excepción
  this.exceptions.push(exception);
};

scheduleSchema.methods.removeException = function(date: Date): void {
  this.exceptions = this.exceptions.filter((ex: IScheduleException) => {
    return ex.date.toDateString() !== date.toDateString();
  });
};

export const Schedule = mongoose.model<ISchedule>('Schedule', scheduleSchema);