import mongoose from "mongoose";
import { config } from "./config";

export async function connectMongo(): Promise<void> {
  try {
    await mongoose.connect(config.mongoUri);
    console.log("✅ Conectado a MongoDB Notifications");
  } catch (err: any) {
    console.error("❌ Error al conectar MongoDB:", err.message);
    setTimeout(connectMongo, 5000);
  }
}

export interface INotification {
  userId: string;
  message: string;
  type: string;
  date?: Date;
}

const NotificationSchema = new mongoose.Schema<INotification>({
  userId: String,
  message: String,
  type: String,
  date: { type: Date, default: Date.now },
});

export const Notification = mongoose.model<INotification>(
  "Notification",
  NotificationSchema
);
