import jwt from "jsonwebtoken";
import { logger } from "./logger.js";
import ENV from "../config/env.js";

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export const verifyToken = (token: string): TokenPayload => {
  try {
    return jwt.verify(token, ENV.JWT_SECRET) as TokenPayload;
  } catch (error) {
    logger.error("Error verificando token:", error);
    throw new Error("Token inválido o expirado");
  }
};

export const decodeToken = (token: string): TokenPayload | null => {
  try {
    return jwt.decode(token) as TokenPayload;
  } catch (error) {
    logger.error("Error decodificando token:", error);
    return null;
  }
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  try {
    return jwt.verify(token, ENV.JWT_REFRESH_SECRET) as TokenPayload;
  } catch (error) {
    logger.error("Error verificando refresh token:", error);
    throw new Error("Refresh token inválido o expirado");
  }
};
