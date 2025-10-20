import mongoose, { Document, Schema } from "mongoose";

export interface IUsageTracking extends Document {
  userId: string;
  period: {
    month: number;
    year: number;
  };
  usage: {
    appointments: {
      count: number;
      limit: number;
    };
    storage: {
      usedMB: number;
      limitMB: number;
    };
    apiCalls: {
      count: number;
      limit: number;
    };
  };
  lastUpdated: Date;
  createdAt: Date;
}

const usageTrackingSchema = new Schema<IUsageTracking>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    period: {
      month: {
        type: Number,
        required: true,
        min: 1,
        max: 12,
      },
      year: {
        type: Number,
        required: true,
      },
    },
    usage: {
      appointments: {
        count: { type: Number, default: 0 },
        limit: { type: Number, required: true },
      },
      storage: {
        usedMB: { type: Number, default: 0 },
        limitMB: { type: Number, required: true },
      },
      apiCalls: {
        count: { type: Number, default: 0 },
        limit: { type: Number, default: 0 },
      },
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

usageTrackingSchema.index(
  { userId: 1, "period.month": 1, "period.year": 1 },
  { unique: true }
);

export const UsageTracking = mongoose.model<IUsageTracking>(
  "UsageTracking",
  usageTrackingSchema
);
