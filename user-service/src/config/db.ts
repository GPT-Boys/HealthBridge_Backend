import mongoose from "mongoose";
import { ENV } from "./env.js";
import { logger } from "../utils/logger.js";

export const connectDB = async () => {
  try {
    await mongoose.connect(ENV.MONGODB_URI);
    logger.info("✅ Connected to MongoDB (User Service)");
  } catch (err) {
    logger.error("❌ MongoDB connection error:", err);
    process.exit(1);
  }
};
