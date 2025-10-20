import mongoose from "mongoose";
import { logger } from "../utils/logger.js";
import ENV from "./env.js";

const config = {
  uri: ENV.MONGODB_URI,
  options: {
    maxPoolSize: 10,
    minPoolSize: 2,
    socketTimeoutMS: 45000,
    serverSelectionTimeoutMS: 5000,
    family: 4,
  },
};

export const connectDatabase = async (): Promise<void> => {
  try {
    mongoose.set("strictQuery", false);
    await mongoose.connect(config.uri, config.options);

    logger.info("✅ Conectado a MongoDB - Subscription Service");

    mongoose.connection.on("error", (error) => {
      logger.error("❌ MongoDB connection error:", error);
    });

    mongoose.connection.on("disconnected", () => {
      logger.warn("⚠️  MongoDB desconectado");
    });

    mongoose.connection.on("reconnected", () => {
      logger.info("🔄 MongoDB reconectado");
    });

    process.on("SIGINT", async () => {
      await mongoose.connection.close();
      logger.info("👋 MongoDB connection closed");
      process.exit(0);
    });
  } catch (error) {
    logger.error("❌ Error conectando a MongoDB:", error);
    process.exit(1);
  }
};

export default mongoose;
