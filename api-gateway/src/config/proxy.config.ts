import { type Options } from "http-proxy-middleware";
import { logger } from "../utils/logger.js";
import ENV from "./env.js";

export const createProxyOptions = (
  targetUrl: string,
  pathPrefix: string,
  timeout: number = ENV.PROXY_TIMEOUT
): Options & Record<string, any> => {
  return {
    target: targetUrl,
    changeOrigin: ENV.PROXY_CHANGE_ORIGIN,
    pathRewrite: {
      [`^${pathPrefix}`]: "",
    },
    timeout,
    proxyTimeout: timeout,
    onProxyReq: (proxyReq: any, req: any) => {
      // Add custom headers with user info
      if (req.user) {
        proxyReq.setHeader("X-User-Id", req.user.userId);
        proxyReq.setHeader("X-User-Email", req.user.email);
        proxyReq.setHeader("X-User-Role", req.user.role);
      }

      // Add request ID for tracking
      if (req.requestId) {
        proxyReq.setHeader("X-Request-Id", req.requestId);
      }

      logger.http("Proxy request", {
        requestId: req.requestId,
        method: req.method,
        path: req.path,
        target: targetUrl,
        userId: req.user?.userId,
      });
    },
    onProxyRes: (proxyRes: any, req: any) => {
      logger.http("Proxy response", {
        requestId: req.requestId,
        method: req.method,
        path: req.url,
        status: proxyRes.statusCode,
      });

      // Add custom headers
      proxyRes.headers["X-Powered-By"] = "HealthBridge";
      if (req.requestId) {
        proxyRes.headers["X-Request-Id"] = req.requestId;
      }
    },
    onError: (err: Error, req: any, res: any) => {
      logger.error("Proxy error", {
        requestId: req.requestId,
        error: err.message,
        method: req.method,
        path: req.url,
        target: targetUrl,
      });

      res.status(503).json({
        error: "Servicio temporalmente no disponible",
        message: "El servicio solicitado no está disponible en este momento",
        code: "SERVICE_UNAVAILABLE",
        requestId: req.requestId,
      });
    },
  };
};
