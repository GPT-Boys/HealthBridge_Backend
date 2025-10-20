import mongoose from "mongoose";

const userProfileSchema = new mongoose.Schema({
  authId: { type: String, required: true }, // ID del auth-service
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: String,
  role: { type: String, enum: ["doctor", "patient", "admin"], required: true },
  specialty: String,
  clinicName: String,
  address: String,
  availability: [
    {
      day: String,
      start: String,
      end: String,
    },
  ],
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("UserProfile", userProfileSchema);
