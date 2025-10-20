import { Request, Response } from "express";
import UserProfile from "../models/UserProfile";

export const getUsers = async (_: Request, res: Response) => {
  const users = await UserProfile.find();
  res.json(users);
};

export const getUserById = async (req: Request, res: Response) => {
  const user = await UserProfile.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json(user);
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const newUser = new UserProfile(req.body);
    await newUser.save();
    res.status(201).json(newUser);
  } catch (error) {
    res.status(400).json({ message: "Error creating user", error });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const updated = await UserProfile.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: "User not found" });
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: "Error updating user", error });
  }
};
