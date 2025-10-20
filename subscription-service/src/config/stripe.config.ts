import Stripe from "stripe";
import ENV from "./env.js";
import { logger } from "../utils/logger.js";

export const stripe = new Stripe(ENV.STRIPE_SECRET_KEY, {
  apiVersion: "2025-09-30.clover",
  typescript: true,
});

logger.info("✅ Stripe configurado");

export default stripe;
