import jwt from "jsonwebtoken";
import { type IUser } from "../models/User.js";
import ENV from "../config/env.js";

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export const generateAccessToken = (user: IUser): string => {
  const payload: TokenPayload = {
    // userId: user._id.toString(),
    userId: (user._id as any).toString(),
    email: user.email,
    role: user.role,
  };

  return jwt.sign(payload, ENV.JWT_SECRET, {
    expiresIn: ENV.JWT_EXPIRES_IN as any,
    issuer: "healthbridge-auth",
    audience: "healthbridge-app",
  });
};

export const generateRefreshToken = (user: IUser): string => {
  const payload: TokenPayload = {
    userId: (user._id as any).toString(),
    email: user.email,
    role: user.role,
  };

  return jwt.sign(payload, ENV.JWT_REFRESH_SECRET, {
    expiresIn: ENV.JWT_REFRESH_EXPIRES_IN as any,
    issuer: "healthbridge-auth",
    audience: "healthbridge-app",
  });
};

export const verifyAccessToken = (token: string): TokenPayload => {
  try {
    return jwt.verify(token, ENV.JWT_SECRET, {
      issuer: "healthbridge-auth",
      audience: "healthbridge-app",
    }) as TokenPayload;
  } catch (error) {
    throw new Error(`Token inválido o expirado: ${(error as Error).message}`);
  }
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  try {
    return jwt.verify(token, ENV.JWT_REFRESH_SECRET, {
      issuer: "healthbridge-auth",
      audience: "healthbridge-app",
    }) as TokenPayload;
  } catch (error) {
    throw new Error(
      `Refresh token inválido o expirado: ${(error as Error).message}`,
    );
  }
};

export const decodeToken = (token: string): TokenPayload | null => {
  try {
    return jwt.decode(token) as TokenPayload;
  } catch (error) {
    return null;
  }
};
