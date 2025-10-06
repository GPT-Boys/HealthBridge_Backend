import mongoose from "mongoose";
import { logger } from "../utils/logger.js";
import ENV from "./env.js";

interface DatabaseConfig {
  uri: string;
  options: mongoose.ConnectOptions;
}

const config: DatabaseConfig = {
  uri: ENV.MONGODB_URI,
  options: {
    maxPoolSize: 10,
    minPoolSize: 2,
    socketTimeoutMS: 45000,
    serverSelectionTimeoutMS: 5000,
    family: 4, // Use IPv4
  },
};

export const connectDatabase = async (): Promise<void> => {
  try {
    mongoose.set("strictQuery", false);

    await mongoose.connect(config.uri, config.options);

    logger.info("✅ Conectado a MongoDB - Auth Service");

    // Event listeners
    mongoose.connection.on("error", (error) => {
      logger.error("❌ MongoDB connection error:", error);
    });

    mongoose.connection.on("disconnected", () => {
      logger.warn("⚠️  MongoDB desconectado");
    });

    mongoose.connection.on("reconnected", () => {
      logger.info("🔄 MongoDB reconectado");
    });

    // Graceful shutdown
    process.on("SIGINT", async () => {
      await mongoose.connection.close();
      logger.info("👋 MongoDB connection closed through app termination");
      process.exit(0);
    });
  } catch (error) {
    logger.error("❌ Error conectando a MongoDB:", error);
    process.exit(1);
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    logger.info("👋 Desconectado de MongoDB");
  } catch (error) {
    logger.error("Error cerrando conexión de MongoDB:", error);
  }
};

export default mongoose;
