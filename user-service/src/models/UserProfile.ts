import mongoose, { Document, Schema } from "mongoose";

export interface IUserProfile extends Document {
  authId: string;
  name: string;
  email: string;
  phone?: string;
  role: "doctor" | "patient" | "admin";
  
  // Información adicional del paciente
  dateOfBirth?: Date;
  gender?: "male" | "female" | "other";
  bloodType?: string;
  allergies?: string[];
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  
  // Información adicional del doctor
  specialty?: string;
  licenseNumber?: string;
  yearsOfExperience?: number;
  education?: string[];
  languages?: string[];
  clinicName?: string;
  consultationFee?: number;
  
  // Dirección
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
  };
  
  // Disponibilidad (para doctores)
  availability?: Array<{
    day: string;
    start: string;
    end: string;
    isAvailable: boolean;
  }>;
  
  // Metadata
  isActive: boolean;
  isVerified: boolean;
  profilePicture?: string;
  bio?: string;
  rating?: number;
  reviewsCount?: number;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
  
  // Métodos
  getFullProfile(): object;
  getDoctorPublicInfo(): object;
}

const userProfileSchema = new Schema<IUserProfile>(
  {
    authId: { 
      type: String, 
      required: true, 
      unique: true,
      index: true 
    },
    name: { 
      type: String, 
      required: true,
      trim: true 
    },
    email: { 
      type: String, 
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    phone: { 
      type: String,
      trim: true 
    },
    role: { 
      type: String, 
      enum: ["doctor", "patient", "admin"], 
      required: true,
      index: true
    },
    
    // Información del paciente
    dateOfBirth: Date,
    gender: { 
      type: String, 
      enum: ["male", "female", "other"] 
    },
    bloodType: String,
    allergies: [String],
    emergencyContact: {
      name: String,
      phone: String,
      relationship: String,
    },
    
    // Información del doctor
    specialty: { 
      type: String,
      index: true 
    },
    licenseNumber: String,
    yearsOfExperience: Number,
    education: [String],
    languages: [String],
    clinicName: String,
    consultationFee: Number,
    
    // Dirección
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      zipCode: String,
    },
    
    // Disponibilidad
    availability: [
      {
        day: { 
          type: String,
          enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        },
        start: String,
        end: String,
        isAvailable: { type: Boolean, default: true },
      },
    ],
    
    // Metadata
    isActive: { 
      type: Boolean, 
      default: true,
      index: true
    },
    isVerified: { 
      type: Boolean, 
      default: false 
    },
    profilePicture: String,
    bio: { 
      type: String,
      maxlength: 500 
    },
    rating: { 
      type: Number, 
      min: 0, 
      max: 5,
      default: 0 
    },
    reviewsCount: { 
      type: Number, 
      default: 0 
    },
    lastLogin: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Índices compuestos
userProfileSchema.index({ role: 1, isActive: 1 });
userProfileSchema.index({ specialty: 1, rating: -1 });

// Método de instancia: obtener perfil completo
userProfileSchema.methods.getFullProfile = function() {
  return {
    id: this._id,
    authId: this.authId,
    name: this.name,
    email: this.email,
    phone: this.phone,
    role: this.role,
    dateOfBirth: this.dateOfBirth,
    gender: this.gender,
    bloodType: this.bloodType,
    allergies: this.allergies,
    emergencyContact: this.emergencyContact,
    specialty: this.specialty,
    licenseNumber: this.licenseNumber,
    yearsOfExperience: this.yearsOfExperience,
    education: this.education,
    languages: this.languages,
    clinicName: this.clinicName,
    consultationFee: this.consultationFee,
    address: this.address,
    availability: this.availability,
    isActive: this.isActive,
    isVerified: this.isVerified,
    profilePicture: this.profilePicture,
    bio: this.bio,
    rating: this.rating,
    reviewsCount: this.reviewsCount,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
    lastLogin: this.lastLogin,
  };
};

// Método de instancia: obtener info pública del doctor
userProfileSchema.methods.getDoctorPublicInfo = function() {
  return {
    id: this._id,
    name: this.name,
    specialty: this.specialty,
    yearsOfExperience: this.yearsOfExperience,
    languages: this.languages,
    clinicName: this.clinicName,
    consultationFee: this.consultationFee,
    availability: this.availability,
    bio: this.bio,
    rating: this.rating,
    reviewsCount: this.reviewsCount,
    profilePicture: this.profilePicture,
  };
};

// Virtual para edad del paciente
userProfileSchema.virtual("age").get(function() {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

export default mongoose.model<IUserProfile>("UserProfile", userProfileSchema);
