import { User, type IUser } from "../models/User.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt.utils.js";
import { logger } from "../utils/logger.js";

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: "admin" | "doctor" | "patient";
  profile?: {
    phone?: string;
    address?: string;
    birthDate?: string;
    gender?: "male" | "female" | "other";
    specialization?: string;
    licenseNumber?: string;
  };
}

export interface LoginData {
  email: string;
  password: string;
}

export class AuthService {
  async register(
    data: RegisterData,
  ): Promise<{ user: IUser; accessToken: string; refreshToken: string }> {
    try {
      // Verificar si el usuario ya existe
      const existingUser = await User.findOne({
        email: data.email.toLowerCase(),
      });
      if (existingUser) {
        throw new Error("El usuario ya existe");
      }

      // Crear nuevo usuario
      const user = new User({
        email: data.email.toLowerCase(),
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        profile: data.profile || {},
      });

      await user.save();

      // Generar tokens
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      // Guardar refresh token
      const refreshTokenExpires = new Date();
      refreshTokenExpires.setDate(refreshTokenExpires.getDate() + 30); // 30 días

      user.refreshTokens.push({
        token: refreshToken,
        expires: refreshTokenExpires,
        createdAt: new Date(),
      });

      await user.save();

      logger.info(`Usuario registrado exitosamente: ${user.email}`);

      return { user, accessToken, refreshToken };
    } catch (error: any) {
      logger.error("Error en registro:", error);
      throw error;
    }
  }

  async login(
    data: LoginData,
    userAgent?: string,
  ): Promise<{ user: IUser; accessToken: string; refreshToken: string }> {
    try {
      // Buscar usuario e incluir password
      const user = await User.findOne({
        email: data.email.toLowerCase(),
        isActive: true,
      }).select("+password");

      if (!user) {
        throw new Error("Credenciales inválidas");
      }

      // Verificar si la cuenta está bloqueada
      if (user.isLocked()) {
        const lockTimeRemaining = Math.ceil(
          (user.security.lockUntil!.getTime() - Date.now()) / 60000,
        );
        throw new Error(
          `Cuenta bloqueada. Intenta nuevamente en ${lockTimeRemaining} minutos`,
        );
      }

      // Verificar contraseña
      const isPasswordValid = await user.comparePassword(data.password);
      if (!isPasswordValid) {
        await user.incrementLoginAttempts();
        throw new Error("Credenciales inválidas");
      }

      // Reset login attempts
      if (user.security.loginAttempts > 0) {
        await user.resetLoginAttempts();
      }

      // Generar tokens
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      // Guardar refresh token
      const refreshTokenExpires = new Date();
      refreshTokenExpires.setDate(refreshTokenExpires.getDate() + 30);

      // Limpiar tokens expirados
      user.refreshTokens = user.refreshTokens.filter(
        (rt) => rt.expires > new Date(),
      );

      // Agregar nuevo refresh token
      user.refreshTokens.push({
        token: refreshToken,
        expires: refreshTokenExpires,
        createdAt: new Date(),
        userAgent: userAgent as any,
      });

      // Actualizar último login
      user.security.lastLogin = new Date();
      await user.save();

      logger.info(`Usuario logueado exitosamente: ${user.email}`);

      return { user, accessToken, refreshToken };
    } catch (error: any) {
      logger.error("Error en login:", error);
      throw error;
    }
  }

  async refreshAccessToken(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      // Verificar refresh token
      const decoded = verifyRefreshToken(refreshToken);

      // Buscar usuario
      const user = await User.findById(decoded.userId);
      if (!user || !user.isActive) {
        throw new Error("Usuario no válido");
      }

      // Verificar que el refresh token existe y no ha expirado
      const tokenExists = user.refreshTokens.find(
        (rt) => rt.token === refreshToken && rt.expires > new Date(),
      );

      if (!tokenExists) {
        throw new Error("Refresh token inválido o expirado");
      }

      // Generar nuevos tokens
      const newAccessToken = generateAccessToken(user);
      const newRefreshToken = generateRefreshToken(user);

      // Reemplazar el refresh token viejo con el nuevo
      user.refreshTokens = user.refreshTokens.filter(
        (rt) => rt.token !== refreshToken,
      );

      const refreshTokenExpires = new Date();
      refreshTokenExpires.setDate(refreshTokenExpires.getDate() + 30);

      user.refreshTokens.push({
        token: newRefreshToken,
        expires: refreshTokenExpires,
        createdAt: new Date(),
      });

      await user.save();

      logger.info(`Token renovado para usuario: ${user.email}`);

      return { accessToken: newAccessToken, refreshToken: newRefreshToken };
    } catch (error: any) {
      logger.error("Error renovando token:", error);
      throw error;
    }
  }

  async verifyToken(token: string): Promise<IUser> {
    try {
      const decoded = verifyRefreshToken(token);

      const user = await User.findById(decoded.userId);
      if (!user || !user.isActive) {
        throw new Error("Usuario no válido");
      }

      return user;
    } catch (error: any) {
      logger.error("Error verificando token:", error);
      throw error;
    }
  }

  async logout(userId: string, refreshToken: string): Promise<void> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error("Usuario no encontrado");
      }

      // Remover el refresh token específico
      user.refreshTokens = user.refreshTokens.filter(
        (rt) => rt.token !== refreshToken,
      );
      await user.save();

      logger.info(`Usuario deslogueado: ${user.email}`);
    } catch (error: any) {
      logger.error("Error en logout:", error);
      throw error;
    }
  }

  async logoutAll(userId: string): Promise<void> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error("Usuario no encontrado");
      }

      // Remover todos los refresh tokens
      user.refreshTokens = [];
      await user.save();

      logger.info(
        `Usuario deslogueado de todos los dispositivos: ${user.email}`,
      );
    } catch (error: any) {
      logger.error("Error en logout all:", error);
      throw error;
    }
  }
}
