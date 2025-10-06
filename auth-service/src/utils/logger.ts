import winston from "winston";
import ENV from "../config/env.js";

const timezone = () => {
  return new Date().toLocaleString("en-US", { timeZone: "America/New_York" });
};

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: timezone }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json(),
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: timezone }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  }),
);

export const logger = winston.createLogger({
  level: ENV.LOG_LEVEL,
  format: logFormat,
  defaultMeta: { service: "auth-service" },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: consoleFormat,
    }),
    // File transport para errores
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // File transport para todos los logs
    new winston.transports.File({
      filename: "logs/combined.log",
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});
