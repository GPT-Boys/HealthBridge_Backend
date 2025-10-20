import express from "express";
import cors from "cors";
import { connectDB } from "./config/db";      // ✅
import { ENV } from "./config/env";           // ✅
import userRoutes from "./routes/user.routes"; // ✅

const app = express();
app.use(cors());
app.use(express.json());

connectDB();

app.use("/users", userRoutes);

app.listen(ENV.PORT, () => {
  console.log(`🚀 User Service running on port ${ENV.PORT}`);
});
