import jwt from 'jsonwebtoken';
import ENV from '../config/env.js';

export interface JWTPayload {
  userId: string;
  email: string;
  role: 'admin' | 'doctor' | 'patient';
  iat?: number;
  exp?: number;
}

export const verifyToken = (token: string): JWTPayload => {
  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    throw new Error('Token inválido o expirado');
  }
};

export const generateToken = (payload: Omit<JWTPayload, 'iat' | 'exp'>, expiresIn: string = '24h'): string => {
  return jwt.sign(payload, ENV.JWT_SECRET, { expiresIn } as any);
};
