import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import ENV from "../config/env.js";

const timezone = () => {
  return new Date().toLocaleString("en-US", { timeZone: "America/La_Paz" });
};

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: timezone }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: timezone }),
  winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
    let msg = `${timestamp} [${level}]`;
    if (service) msg += ` [${service}]`;
    msg += `: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

// Daily rotate file transport
const dailyRotateFileTransport = new DailyRotateFile({
  filename: "logs/application-%DATE%.log",
  datePattern: "YYYY-MM-DD",
  zippedArchive: true,
  maxSize: "20m",
  maxFiles: "14d",
});

export const logger = winston.createLogger({
  level: ENV.LOG_LEVEL,
  format: logFormat,
  defaultMeta: { service: "API Gateway" },
  transports: [
    new winston.transports.Console({
      format: consoleFormat,
    }),
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
      maxsize: 5242880,
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: "logs/combined.log",
      maxsize: 5242880,
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: "logs/requests.log",
      level: "http",
      maxsize: 5242880,
      maxFiles: 5,
    }),
    dailyRotateFileTransport,
  ],
});

export const morganStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};
