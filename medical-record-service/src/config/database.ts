// =====================================================
// src/config/database.ts
// =====================================================

import mongoose from 'mongoose';
import type { ConnectOptions } from 'mongoose';
import { logger } from '../utils/logger.js';
import ENV from './env.js';

export const connectDatabase = async (): Promise<void> => {
  try {
    const options: ConnectOptions = {
      maxPoolSize: 10,
      minPoolSize: 5,
      socketTimeoutMS: 45_000,
      serverSelectionTimeoutMS: 5_000,
      // Nota: "family" no es parte de ConnectOptions y puede causar errores de tipos
    };

    await mongoose.connect(ENV.MONGODB_URI, options);

    logger.info('✅ Conectado a MongoDB - Medical Record Service', {
      database: mongoose.connection.name,
      host: mongoose.connection.host,
    });

    // Manejo de eventos de conexión
    mongoose.connection.on('error', (err) => {
      logger.error('❌ Error de conexión a MongoDB:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('⚠️  Desconectado de MongoDB');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('🔄 Reconectado a MongoDB');
    });
  } catch (error) {
    logger.error('❌ Error al conectar a MongoDB:', error);
    process.exit(1);
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    logger.info('👋 Desconectado de MongoDB');
  } catch (error) {
    logger.error('Error al desconectar de MongoDB:', error);
  }
};
