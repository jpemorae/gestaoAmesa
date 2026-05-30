import { Router } from "express";
import { requireAuth, requireProfile } from "../middleware/auth.js";
import { listCompanies, createCompany, updateCompany } from "../controllers/company.controller.js";
const router = Router();
router.use(requireAuth);
router.get("/", requireProfile(["Super Admin"]), listCompanies);
router.post("/", requireProfile(["Super Admin"]), createCompany);
router.put("/:id", requireProfile(["Super Admin"]), updateCompany);
export default router;
