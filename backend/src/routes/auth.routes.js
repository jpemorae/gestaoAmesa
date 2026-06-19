import { Router } from "express";
import { login, me } from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { authRateLimiter } from "../middleware/rateLimit.js";
const router = Router();
router.post("/login", authRateLimiter, login);
router.get("/me", requireAuth, me);
export default router;
