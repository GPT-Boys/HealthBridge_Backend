import mongoose, { Document, Schema } from "mongoose";

export interface ISubscription extends Document {
  userId: string;
  planType: "basic" | "premium" | "enterprise";
  status: "active" | "cancelled" | "expired" | "trial";
  startDate: Date;
  endDate: Date;
  autoRenew: boolean;
  paymentMethod: "stripe" | "cash" | "bank_transfer";
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  lastPaymentDate?: Date;
  nextPaymentDate?: Date;
  trialEndsAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;

  isActive(): boolean;
  isExpired(): boolean;
  isTrial(): boolean;
  canUpgrade(): boolean;
  canDowngrade(): boolean;
}

const subscriptionSchema = new Schema<ISubscription>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    planType: {
      type: String,
      enum: ["basic", "premium", "enterprise"],
      required: true,
      default: "basic",
    },
    status: {
      type: String,
      enum: ["active", "cancelled", "expired", "trial"],
      required: true,
      default: "active",
    },
    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: true,
    },
    autoRenew: {
      type: Boolean,
      default: false,
    },
    paymentMethod: {
      type: String,
      enum: ["stripe", "cash", "bank_transfer"],
      default: "stripe",
    },
    stripeCustomerId: String,
    stripeSubscriptionId: String,
    lastPaymentDate: Date,
    nextPaymentDate: Date,
    trialEndsAt: Date,
    cancelledAt: Date,
    cancellationReason: String,
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

subscriptionSchema.index({ userId: 1, status: 1 });
subscriptionSchema.index({ endDate: 1 });
subscriptionSchema.index({ stripeCustomerId: 1 }, { sparse: true });

subscriptionSchema.methods.isActive = function (): boolean {
  return this.status === "active" && this.endDate > new Date();
};

subscriptionSchema.methods.isExpired = function (): boolean {
  return this.endDate < new Date();
};

subscriptionSchema.methods.isTrial = function (): boolean {
  return (
    this.status === "trial" &&
    this.trialEndsAt !== undefined &&
    this.trialEndsAt > new Date()
  );
};

subscriptionSchema.methods.canUpgrade = function (): boolean {
  return this.planType !== "enterprise" && this.isActive();
};

subscriptionSchema.methods.canDowngrade = function (): boolean {
  return this.planType !== "basic" && this.isActive();
};

export const Subscription = mongoose.model<ISubscription>(
  "Subscription",
  subscriptionSchema
);
