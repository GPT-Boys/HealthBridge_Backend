import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { connectDB } from "./config/db";
import userRoutes from "./routes/user.routes";

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/users", userRoutes);

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`🚀 User Service running on port ${PORT}`));
