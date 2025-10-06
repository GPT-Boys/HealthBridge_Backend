import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcryptjs";
import ENV from "../config/env.js";

export interface IUser extends Document {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: "admin" | "doctor" | "patient";
  isActive: boolean;
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  profile: {
    phone?: string;
    address?: string;
    birthDate?: Date;
    gender?: "male" | "female" | "other";
    specialization?: string; // for doctors
    licenseNumber?: string; // for doctors
    avatar?: string;
  };
  security: {
    loginAttempts: number;
    lockUntil?: Date;
    lastLogin?: Date;
    lastPasswordChange?: Date;
    twoFactorEnabled: boolean;
    twoFactorSecret?: string;
  };
  refreshTokens: Array<{
    token: string;
    expires: Date;
    createdAt: Date;
    userAgent?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;

  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  incrementLoginAttempts(): Promise<void>;
  resetLoginAttempts(): Promise<void>;
  isLocked(): boolean;
  getFullName(): string;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, "El email es obligatorio"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Email inválido"],
    },
    password: {
      type: String,
      required: [true, "La contraseña es obligatoria"],
      minlength: [12, "La contraseña debe tener al menos 12 caracteres"],
      select: false, // No incluir password en queries por defecto
    },
    firstName: {
      type: String,
      required: [true, "El nombre es obligatorio"],
      trim: true,
      minlength: [2, "El nombre debe tener al menos 2 caracteres"],
      maxlength: [50, "El nombre no puede exceder 50 caracteres"],
    },
    lastName: {
      type: String,
      required: [true, "El apellido es obligatorio"],
      trim: true,
      minlength: [2, "El apellido debe tener al menos 2 caracteres"],
      maxlength: [50, "El apellido no puede exceder 50 caracteres"],
    },
    role: {
      type: String,
      enum: {
        values: ["admin", "doctor", "patient"],
        message: "{VALUE} no es un rol válido",
      },
      required: [true, "El rol es obligatorio"],
      default: "patient",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    profile: {
      phone: {
        type: String,
        match: [/^\+?[\d\s-()]+$/, "Número de teléfono inválido"],
      },
      address: String,
      birthDate: Date,
      gender: {
        type: String,
        enum: ["male", "female", "other"],
      },
      specialization: String,
      licenseNumber: String,
      avatar: String,
    },
    security: {
      loginAttempts: {
        type: Number,
        default: 0,
      },
      lockUntil: Date,
      lastLogin: Date,
      lastPasswordChange: Date,
      twoFactorEnabled: {
        type: Boolean,
        default: false,
      },
      twoFactorSecret: String,
    },
    refreshTokens: [
      {
        token: String,
        expires: Date,
        createdAt: {
          type: Date,
          default: Date.now,
        },
        userAgent: String,
      },
    ],
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (/*doc,*/ ret) {
        // delete ret.password;
        // delete ret.refreshTokens;
        delete ret.emailVerificationToken;
        delete ret.passwordResetToken;
        delete ret.security.twoFactorSecret;
        return ret;
      },
    },
  },
);

// Indexes
// userSchema.index({ email: 1 });
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ "security.lockUntil": 1 }, { sparse: true });

// Pre-save middleware para hashear password
userSchema.pre("save", async function (next) {
  // Solo hashear si el password fue modificado
  if (!this.isModified("password")) {
    return next();
  }

  try {
    const rounds = ENV.BCRYPT_ROUNDS;
    const salt = await bcrypt.genSalt(rounds);
    this.password = await bcrypt.hash(this.password, salt);
    this.security.lastPasswordChange = new Date();
    next();
  } catch (error: any) {
    next(error);
  }
});

// Método para comparar passwords
userSchema.methods.comparePassword = async function (
  candidatePassword: string,
): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error(`Error comparando contraseñas: ${error}`);
  }
};

// Incrementar intentos de login
userSchema.methods.incrementLoginAttempts = async function (): Promise<void> {
  // Si el bloqueo ha expirado, resetear intentos
  if (this.security.lockUntil && this.security.lockUntil < new Date()) {
    return this.updateOne({
      $set: { "security.loginAttempts": 1 },
      $unset: { "security.lockUntil": 1 },
    });
  }

  const updates: any = { $inc: { "security.loginAttempts": 1 } };
  const maxAttempts = ENV.MAX_LOGIN_ATTEMPTS;

  // Bloquear cuenta si se alcanza el máximo de intentos
  if (this.security.loginAttempts + 1 >= maxAttempts && !this.isLocked()) {
    const lockTimeMs = 15 * 60 * 1000; // 15 minutos
    updates.$set = { "security.lockUntil": new Date(Date.now() + lockTimeMs) };
  }

  return this.updateOne(updates);
};

// Resetear intentos de login
userSchema.methods.resetLoginAttempts = async function (): Promise<void> {
  return this.updateOne({
    $set: {
      "security.loginAttempts": 0,
      "security.lastLogin": new Date(),
    },
    $unset: { "security.lockUntil": 1 },
  });
};

// Verificar si la cuenta está bloqueada
userSchema.methods.isLocked = function (): boolean {
  return !!(this.security.lockUntil && this.security.lockUntil > new Date());
};

// Obtener nombre completo
userSchema.methods.getFullName = function (): string {
  return `${this.firstName} ${this.lastName}`;
};

export const User = mongoose.model<IUser>("User", userSchema);
