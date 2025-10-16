import mongoose from 'mongoose';
import ENV from './env.js';
import { logger } from '../utils/logger.js';

// Configuración de conexión
const mongooseOptions = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  bufferCommands: false,
  //bufferMaxEntries: 0,
};

export const connectDatabase = async (): Promise<void> => {
  try {
    logger.info('🔌 Conectando a MongoDB...');
    
    await mongoose.connect(ENV.MONGODB_URI, mongooseOptions);
    
    logger.info('✅ Conexión exitosa a MongoDB');
    logger.info(`📍 Base de datos: ${mongoose.connection.db?.databaseName}`);
    
    // Event listeners para la conexión
    mongoose.connection.on('error', (error: any) => {
      logger.error('❌ Error de MongoDB:', error);
    });
    
    mongoose.connection.on('disconnected', () => {
      logger.warn('⚠️ MongoDB desconectado');
    });
    
    mongoose.connection.on('reconnected', () => {
      logger.info('🔄 MongoDB reconectado');
    });
    
  } catch (error) {
    logger.error('❌ Error conectando a MongoDB:', error);
    throw error;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    logger.info('🔌 Desconectado de MongoDB');
  } catch (error) {
    logger.error('❌ Error desconectando de MongoDB:', error);
    throw error;
  }
};

// Configurar eventos de proceso para cerrar la conexión limpiamente
process.on('SIGINT', async () => {
  try {
    await disconnectDatabase();
    process.exit(0);
  } catch (error) {
    logger.error('Error cerrando conexión:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  try {
    await disconnectDatabase();
    process.exit(0);
  } catch (error) {
    logger.error('Error cerrando conexión:', error);
    process.exit(1);
  }
});