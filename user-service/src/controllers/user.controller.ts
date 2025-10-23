import { Request, Response } from "express";
import UserProfile from "../models/UserProfile.js";
import { logger } from "../utils/logger.js";

// GET /users - Obtener todos los usuarios (admin)
export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { role, isActive, page = 1, limit = 10 } = req.query;
    
    const filter: any = {};
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    
    const skip = (Number(page) - 1) * Number(limit);
    
    const [users, total] = await Promise.all([
      UserProfile.find(filter)
        .select('-__v')
        .skip(skip)
        .limit(Number(limit))
        .sort({ createdAt: -1 }),
      UserProfile.countDocuments(filter)
    ]);
    
    res.json({
      users,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      }
    });
    
    logger.info('Usuarios obtenidos', { count: users.length, filter });
  } catch (error: any) {
    logger.error('Error obteniendo usuarios:', error);
    res.status(500).json({ 
      message: "Error obteniendo usuarios", 
      error: error.message 
    });
  }
};

// GET /users/:id - Obtener usuario por ID
export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await UserProfile.findById(req.params.id).select('-__v');
    
    if (!user) {
      res.status(404).json({ message: "Usuario no encontrado" });
      return;
    }
    
    res.json(user.getFullProfile());
    logger.info('Usuario obtenido:', { userId: req.params.id });
  } catch (error: any) {
    logger.error('Error obteniendo usuario:', error);
    res.status(500).json({ 
      message: "Error obteniendo usuario", 
      error: error.message 
    });
  }
};

// POST /users - Crear nuevo usuario
export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validar que no exista el authId
    const existingUser = await UserProfile.findOne({ authId: req.body.authId });
    if (existingUser) {
      res.status(409).json({ message: "El usuario ya existe" });
      return;
    }
    
    const newUser = new UserProfile(req.body);
    await newUser.save();
    
    res.status(201).json(newUser.getFullProfile());
    logger.info('Usuario creado:', { userId: newUser._id, authId: newUser.authId });
  } catch (error: any) {
    logger.error('Error creando usuario:', error);
    res.status(400).json({ 
      message: "Error creando usuario", 
      error: error.message 
    });
  }
};

// PUT /users/:id - Actualizar usuario
export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    // Prevenir actualización de campos sensibles
    const { authId, role, ...updateData } = req.body;
    
    const updated = await UserProfile.findByIdAndUpdate(
      req.params.id, 
      { ...updateData, updatedAt: new Date() }, 
      { new: true, runValidators: true }
    ).select('-__v');
    
    if (!updated) {
      res.status(404).json({ message: "Usuario no encontrado" });
      return;
    }
    
    res.json(updated.getFullProfile());
    logger.info('Usuario actualizado:', { userId: req.params.id });
  } catch (error: any) {
    logger.error('Error actualizando usuario:', error);
    res.status(400).json({ 
      message: "Error actualizando usuario", 
      error: error.message 
    });
  }
};

// DELETE /users/:id - Eliminar usuario (soft delete)
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const updated = await UserProfile.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    
    if (!updated) {
      res.status(404).json({ message: "Usuario no encontrado" });
      return;
    }
    
    res.json({ message: "Usuario desactivado correctamente", user: updated });
    logger.info('Usuario desactivado:', { userId: req.params.id });
  } catch (error: any) {
    logger.error('Error eliminando usuario:', error);
    res.status(500).json({ 
      message: "Error eliminando usuario", 
      error: error.message 
    });
  }
};

// GET /doctors - Obtener lista de doctores
export const getDoctors = async (req: Request, res: Response): Promise<void> => {
  try {
    const { specialty, page = 1, limit = 10, sortBy = 'rating' } = req.query;
    
    const filter: any = { role: 'doctor', isActive: true };
    if (specialty) filter.specialty = specialty;
    
    const skip = (Number(page) - 1) * Number(limit);
    const sortOptions: any = {};
    
    if (sortBy === 'rating') {
      sortOptions.rating = -1;
    } else if (sortBy === 'name') {
      sortOptions.name = 1;
    }
    
    const [doctors, total] = await Promise.all([
      UserProfile.find(filter)
        .select('name specialty yearsOfExperience languages clinicName consultationFee bio rating reviewsCount profilePicture availability')
        .skip(skip)
        .limit(Number(limit))
        .sort(sortOptions),
      UserProfile.countDocuments(filter)
    ]);
    
    const doctorsPublicInfo = doctors.map(doctor => doctor.getDoctorPublicInfo());
    
    res.json({
      doctors: doctorsPublicInfo,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      }
    });
    
    logger.info('Doctores obtenidos', { count: doctors.length, specialty });
  } catch (error: any) {
    logger.error('Error obteniendo doctores:', error);
    res.status(500).json({ 
      message: "Error obteniendo doctores", 
      error: error.message 
    });
  }
};

// GET /doctors/:id - Obtener información pública de un doctor
export const getDoctorById = async (req: Request, res: Response): Promise<void> => {
  try {
    const doctor = await UserProfile.findOne({ 
      _id: req.params.id, 
      role: 'doctor',
      isActive: true 
    });
    
    if (!doctor) {
      res.status(404).json({ message: "Doctor no encontrado" });
      return;
    }
    
    res.json(doctor.getDoctorPublicInfo());
    logger.info('Doctor obtenido:', { doctorId: req.params.id });
  } catch (error: any) {
    logger.error('Error obteniendo doctor:', error);
    res.status(500).json({ 
      message: "Error obteniendo doctor", 
      error: error.message 
    });
  }
};

// GET /me - Obtener perfil del usuario autenticado
export const getMyProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const authId = (req as any).user?.id || (req as any).user?.userId;
    
    if (!authId) {
      res.status(401).json({ message: "No autenticado" });
      return;
    }
    
    const user = await UserProfile.findOne({ authId }).select('-__v');
    
    if (!user) {
      res.status(404).json({ message: "Perfil no encontrado" });
      return;
    }
    
    // Actualizar último login
    user.lastLogin = new Date();
    await user.save();
    
    res.json(user.getFullProfile());
    logger.info('Perfil propio obtenido:', { authId });
  } catch (error: any) {
    logger.error('Error obteniendo perfil propio:', error);
    res.status(500).json({ 
      message: "Error obteniendo perfil", 
      error: error.message 
    });
  }
};

// PUT /me - Actualizar perfil del usuario autenticado
export const updateMyProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const authId = (req as any).user?.id || (req as any).user?.userId;
    
    if (!authId) {
      res.status(401).json({ message: "No autenticado" });
      return;
    }
    
    // Prevenir actualización de campos sensibles
    const { authId: _, role, isVerified, rating, reviewsCount, ...updateData } = req.body;
    
    const updated = await UserProfile.findOneAndUpdate(
      { authId },
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).select('-__v');
    
    if (!updated) {
      res.status(404).json({ message: "Perfil no encontrado" });
      return;
    }
    
    res.json(updated.getFullProfile());
    logger.info('Perfil propio actualizado:', { authId });
  } catch (error: any) {
    logger.error('Error actualizando perfil propio:', error);
    res.status(400).json({ 
      message: "Error actualizando perfil", 
      error: error.message 
    });
  }
};

// GET /stats - Estadísticas del servicio (admin)
export const getStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const [
      totalUsers,
      totalDoctors,
      totalPatients,
      activeUsers,
      verifiedUsers,
      specialties
    ] = await Promise.all([
      UserProfile.countDocuments(),
      UserProfile.countDocuments({ role: 'doctor' }),
      UserProfile.countDocuments({ role: 'patient' }),
      UserProfile.countDocuments({ isActive: true }),
      UserProfile.countDocuments({ isVerified: true }),
      UserProfile.distinct('specialty', { role: 'doctor' })
    ]);
    
    res.json({
      totalUsers,
      totalDoctors,
      totalPatients,
      activeUsers,
      verifiedUsers,
      specialtiesCount: specialties.length,
      specialties: specialties.filter(Boolean)
    });
    
    logger.info('Estadísticas obtenidas');
  } catch (error: any) {
    logger.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ 
      message: "Error obteniendo estadísticas", 
      error: error.message 
    });
  }
};
