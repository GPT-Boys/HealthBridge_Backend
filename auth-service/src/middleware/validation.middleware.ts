import { type Request, type Response, type NextFunction } from "express";
import { body, validationResult } from "express-validator";
import { validateEmail, validatePassword } from "../utils/validators.js";

export const validateRegister = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("El email es obligatorio")
    .isEmail()
    .withMessage("Email inválido")
    .normalizeEmail()
    .custom((value) => {
      const validation = validateEmail(value);
      if (!validation) {
        throw new Error("El Email es inválido");
      }
      return true;
    }),

  body("password")
    .trim()
    .notEmpty()
    .withMessage("La contraseña es obligatoria")
    .isLength({ min: 12 })
    .withMessage("La contraseña debe tener al menos 12 caracteres")
    .custom((value) => {
      const validation = validatePassword(value);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(", "));
      }
      return true;
    }),

  body("firstName")
    .trim()
    .notEmpty()
    .withMessage("El nombre es obligatorio")
    .isLength({ min: 2, max: 50 })
    .withMessage("El nombre debe tener entre 2 y 50 caracteres")
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
    .withMessage("El nombre solo puede contener letras"),

  body("lastName")
    .trim()
    .notEmpty()
    .withMessage("El apellido es obligatorio")
    .isLength({ min: 2, max: 50 })
    .withMessage("El apellido debe tener entre 2 y 50 caracteres")
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
    .withMessage("El apellido solo puede contener letras"),

  body("role")
    .trim()
    .notEmpty()
    .withMessage("El rol es obligatorio")
    .isIn(["admin", "doctor", "patient"])
    .withMessage("Rol inválido"),

  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Errores de validación",
        details: errors.array(),
      });
    }
    return next();
  },
];

export const validateLogin = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("El email es obligatorio")
    .isEmail()
    .withMessage("Email inválido")
    .normalizeEmail(),

  body("password")
    .trim()
    .notEmpty()
    .withMessage("La contraseña es obligatoria"),

  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Errores de validación",
        details: errors.array(),
      });
    }
    return next();
  },
];
