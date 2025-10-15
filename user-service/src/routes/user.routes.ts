import { Router } from "express";
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
} from "../controllers/user.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/authorize.middleware";

const router = Router();

// Ruta pública (usada por el auth-service al registrar)
router.post("/", createUser);

// 🔒 Rutas protegidas
router.get("/", authenticate, authorize("admin"), getUsers);
router.get("/:id", authenticate, authorize("admin", "doctor"), getUserById);
router.put("/:id", authenticate, authorize("admin", "doctor"), updateUser);

export default router;
