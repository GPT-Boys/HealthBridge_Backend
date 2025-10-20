import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";
import ENV from "../config/env.js";

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      startTime?: number;
    }
  }
}

export const requestTracker = (req: Request, res: Response, next: NextFunction) => {
  if (ENV.ENABLE_REQUEST_TRACKING) {
    req.requestId = (req.headers["x-request-id"] as string) || randomUUID();
    req.startTime = Date.now();

    res.setHeader("X-Request-Id", req.requestId);
  }

  next();
};
