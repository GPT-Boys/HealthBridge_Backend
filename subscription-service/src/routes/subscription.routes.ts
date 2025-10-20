import { Router, type Request, type Response } from "express";
import { SubscriptionController } from "../controllers/subscription.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import {
  validateSubscriptionCreate,
  validatePlanChange,
} from "../middleware/validation.middleware.js";

const router = Router();
const controller = new SubscriptionController();

// Todas las rutas requieren autenticación
router.use(authenticate);

// Obtener mi suscripción actual
router.get("/my-subscription", (req: Request, res: Response) =>
  controller.getMySubscription(req, res)
);

// Crear nueva suscripción
router.post("/", validateSubscriptionCreate, (req: Request, res: Response) =>
  controller.createSubscription(req, res)
);

// Upgrade
router.post("/upgrade", validatePlanChange, (req: Request, res: Response) =>
  controller.upgradeSubscription(req, res)
);

// Downgrade
router.post("/downgrade", validatePlanChange, (req: Request, res: Response) =>
  controller.downgradeSubscription(req, res)
);

// Cancelar
router.post("/cancel", (req: Request, res: Response) =>
  controller.cancelSubscription(req, res)
);

// Checkout session para Stripe
router.post("/checkout-session", (req: Request, res: Response) =>
  controller.createCheckoutSession(req, res)
);

// Webhook de Stripe (sin autenticación)
router.post("/webhook", (req: Request, res: Response) =>
  controller.handleWebhook(req, res)
);

export default router;
