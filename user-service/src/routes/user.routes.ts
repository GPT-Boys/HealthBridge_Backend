import { Router } from "express";
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getDoctors,
  getDoctorById,
  getMyProfile,
  updateMyProfile,
  getStats,
} from "../controllers/user.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/authorize.middleware.js";

const router = Router();

// =====================================================
// RUTAS PÚBLICAS
// =====================================================

// Ruta usada por el auth-service al registrar
router.post("/", createUser);

// Obtener lista de doctores (público para búsqueda)
router.get("/doctors", getDoctors);

// Obtener información de un doctor específico (público)
router.get("/doctors/:id", getDoctorById);

// =====================================================
// RUTAS PROTEGIDAS - Perfil propio
// =====================================================

// Obtener mi perfil
router.get("/me", authenticate, getMyProfile);

// Actualizar mi perfil
router.put("/me", authenticate, updateMyProfile);

// =====================================================
// RUTAS PROTEGIDAS - Gestión de usuarios (Admin/Doctor)
// =====================================================

// Listar todos los usuarios (solo admin)
router.get("/", authenticate, authorize("admin"), getUsers);

// Obtener estadísticas (solo admin)
router.get("/stats", authenticate, authorize("admin"), getStats);

// Obtener usuario específico por ID (admin y doctor)
router.get("/:id", authenticate, authorize("admin", "doctor"), getUserById);

// Actualizar usuario específico (admin y doctor)
router.put("/:id", authenticate, authorize("admin", "doctor"), updateUser);

// Eliminar (desactivar) usuario (solo admin)
router.delete("/:id", authenticate, authorize("admin"), deleteUser);

export default router;
