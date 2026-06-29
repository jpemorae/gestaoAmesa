import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  createBillingCharges,
  listBillingCharges,
  listBillingCustomers,
  registerBillingPayment,
  updateBillingCharge,
  upsertBillingCustomer
} from "../controllers/billing.controller.js";

const router = Router();
router.use(requireAuth);
router.get("/customers", listBillingCustomers);
router.post("/customers", upsertBillingCustomer);
router.put("/customers/:id", upsertBillingCustomer);
router.get("/charges", listBillingCharges);
router.post("/charges", createBillingCharges);
router.put("/charges/:id", updateBillingCharge);
router.post("/charges/:id/payments", registerBillingPayment);

export default router;
