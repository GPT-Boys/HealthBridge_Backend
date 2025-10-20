import mongoose from 'mongoose';
import ENV from './env.js';
import { logger } from '../utils/logger.js';

export const connectDatabase = async (): Promise<void> => {
  try {
    const options = {
      maxPoolSize: 10,
      minPoolSize: 5,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 5000,
      family: 4, // Use IPv4, skip trying IPv6
    };

    await mongoose.connect(ENV.MONGODB_URI, options);
    
    logger.info('📊 Base de datos MongoDB conectada exitosamente');
    logger.info(`🔗 Conectado a: ${ENV.MONGODB_URI.split('@')[1] || ENV.MONGODB_URI}`);
    
    // Manejar eventos de conexión
    mongoose.connection.on('error', (error) => {
      logger.error('❌ Error de conexión a MongoDB:', error);
    });
    
    mongoose.connection.on('disconnected', () => {
      logger.warn('⚠️ MongoDB desconectado');
    });
    
    mongoose.connection.on('reconnected', () => {
      logger.info('🔄 MongoDB reconectado');
    });
    
  } catch (error) {
    logger.error('❌ Error al conectar con la base de datos:', error);
    process.exit(1);
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    logger.info('👋 Desconectado de MongoDB');
  } catch (error) {
    logger.error('❌ Error al desconectar de MongoDB:', error);
    throw error;
  }
};
