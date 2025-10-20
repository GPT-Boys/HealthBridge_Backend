import type { Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";

export const validateSubscriptionCreate = [
  body("planType")
    .trim()
    .notEmpty()
    .withMessage("Plan type requerido")
    .isIn(["basic", "premium", "enterprise"])
    .withMessage("Plan type inválido"),

  body("paymentMethod")
    .optional()
    .isIn(["stripe", "cash", "bank_transfer"])
    .withMessage("Método de pago inválido"),

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

export const validatePlanChange = [
  body("planType")
    .trim()
    .notEmpty()
    .withMessage("Nuevo plan requerido")
    .isIn(["basic", "premium", "enterprise"])
    .withMessage("Plan inválido"),

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
