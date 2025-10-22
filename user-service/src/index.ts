import express from "express";
import cors from "cors";
import { connectDB } from "./config/db";      // conexión a MongoDB
import { ENV } from "./config/env";           // variables de entorno
import userRoutes from "./routes/user.routes";

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Conexión a la base de datos
connectDB();

// ✅ Ruta base del servicio
app.use("/users", userRoutes);

// ✅ Endpoint de salud para el API Gateway
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "user-service",
    port: ENV.PORT,
    timestamp: new Date().toISOString(),
  });
});

// ✅ Levantar el servidor
app.listen(ENV.PORT, () => {
  console.log(`🚀 User Service running on port ${ENV.PORT}`);
});
