import mongoose, { Document, Schema } from "mongoose";

export interface IPlan extends Document {
  name: string;
  type: "basic" | "premium" | "enterprise";
  price: number;
  currency: string;
  billingPeriod: "monthly" | "yearly";
  features: string[];
  limits: {
    appointments: number;
    storage: number;
    filesPerRecord: number;
  };
  isActive: boolean;
  stripePriceId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const planSchema = new Schema<IPlan>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["basic", "premium", "enterprise"],
      required: true,
      unique: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "BOB",
    },
    billingPeriod: {
      type: String,
      enum: ["monthly", "yearly"],
      default: "monthly",
    },
    features: [String],
    limits: {
      appointments: {
        type: Number,
        required: true,
      },
      storage: {
        type: Number,
        required: true,
      },
      filesPerRecord: {
        type: Number,
        required: true,
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    stripePriceId: String,
  },
  {
    timestamps: true,
  }
);

export const Plan = mongoose.model<IPlan>("Plan", planSchema);
