import { Request, Response, NextFunction } from "express";
import axios from "axios";

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Token no proporcionado" });
      return;
    }

    const token = authHeader.split(" ")[1];
    const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || "http://localhost:3001";

    const response = await axios.post(`${AUTH_SERVICE_URL}/api/auth/verify-token`, token);

    if (response.data && typeof response.data === "object" && "user" in response.data) {
      req.user = (response.data as any).user;
    } else {
      throw new Error("Respuesta inesperada del auth-service");
    }

    next();
  } catch (error: unknown) {
    const err = error as any;

    // 🔧 Detección compatible con todas las versiones de Axios
    if (err && typeof err === "object" && "isAxiosError" in err) {
      if (err.response?.status === 401) {
        res.status(401).json({ error: "Token inválido o expirado" });
        return;
      }

      console.error("Error HTTP con auth-service:", err.response?.data || err.message);
      res.status(502).json({ error: "Error comunicándose con auth-service" });
      return;
    }

    console.error("Error en middleware de autenticación:", err.message);
    res.status(500).json({ error: "Error verificando token con auth-service" });
  }
};
