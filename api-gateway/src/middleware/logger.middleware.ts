import type { Request, Response, NextFunction } from "express";
import morgan from "morgan";
import { logger, morganStream } from "../utils/logger.js";

morgan.token("user-id", (req: any) => req.user?.userId || "anonymous");
morgan.token("user-role", (req: any) => req.user?.role || "none");
morgan.token("request-id", (req: any) => req.requestId || "-");

const morganFormat =
  ':remote-addr - :user-id [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] - :response-time ms [Request-ID: :request-id]';

export const morganMiddleware = morgan(morganFormat, { stream: morganStream });

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - startTime;

    logger.info("Request completed", {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      userId: (req as any).user?.userId,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
  });

  next();
};
