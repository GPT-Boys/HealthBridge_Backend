import mongoose from "mongoose";
import { ENV } from "./env"; // ✅ CORRECTO

export const connectDB = async () => {
  try {
    await mongoose.connect(ENV.MONGODB_URI);
    console.log("✅ Connected to MongoDB (User Service)");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
  }
};
