import { Router } from "express";
import { AuthController } from "../controllers/auth.controller.js";
import {
  validateRegister,
  validateLogin,
} from "../middleware/validation.middleware.js";
import { authenticate } from "../middleware/auth.middleware.js";
import rateLimit from "express-rate-limit";

const router = Router();
const authController = new AuthController();

// Rate limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 intentos
  message: { error: "Demasiados intentos. Intenta nuevamente más tarde." },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Demasiadas solicitudes. Intenta nuevamente más tarde." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Public routes
router.post(
  "/register",
  generalLimiter,
  validateRegister,
  (req: any, res: any) => authController.register(req, res),
);
router.post("/login", authLimiter, validateLogin, (req: any, res: any) =>
  authController.login(req, res),
);
router.post("/refresh-token", generalLimiter, (req, res) =>
  authController.refreshToken(req, res),
);
router.post("/verify-token", generalLimiter, (req, res) =>
  authController.verifyToken(req, res),
);

// Protected routes
router.post("/logout", authenticate, (req, res) =>
  authController.logout(req, res),
);
router.post("/logout-all", authenticate, (req, res) =>
  authController.logoutAll(req, res),
);
router.get("/profile", authenticate, (req, res) =>
  authController.getProfile(req, res),
);

// Health check
router.get("/health", (req, res) => {
  res.json({
    service: "auth-service",
    status: "OK",
    path: req.path,
    timestamp: new Date().toLocaleString("en-US", {
      timeZone: "America/New_York",
    }),
  });
});

export default router;
