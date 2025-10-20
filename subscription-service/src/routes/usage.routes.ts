import { Router } from "express";
import { UsageController } from "../controllers/usage.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();
const controller = new UsageController();

// Todas las rutas requieren autenticación
router.use(authenticate);

// Obtener uso actual
router.get("/current", (req, res) => controller.getCurrentUsage(req, res));

// Verificar límite específico
router.get("/check/:feature", (req, res) => controller.checkLimit(req, res));

// Registrar uso (para uso interno entre servicios)
router.post("/track", (req, res) => controller.trackUsage(req, res));

export default router;
