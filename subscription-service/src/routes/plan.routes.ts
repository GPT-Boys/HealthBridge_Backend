import { Router } from "express";
import { PlanController } from "../controllers/plan.controller.js";

const router = Router();
const controller = new PlanController();

// Rutas públicas
router.get("/", (req, res) => controller.getPlans(req, res));
router.get("/:type", (req, res) => controller.getPlan(req, res));

export default router;
