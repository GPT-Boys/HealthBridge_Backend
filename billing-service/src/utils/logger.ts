import winston from 'winston';
import ENV from '../config/env.js';

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue',
};

winston.addColors(colors);

const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

const transports = [
  new winston.transports.Console(),
  new winston.transports.File({
    filename: 'logs/billing-service-error.log',
    level: 'error',
  }),
  new winston.transports.File({
    filename: 'logs/billing-service-combined.log',
  }),
];

export const logger = winston.createLogger({
  level: ENV.LOG_LEVEL,
  levels,
  format,
  transports,
});
