import { Router } from "express";
import {
  appLogin,
  appDataDiagnostics,
  deleteAppClient,
  deleteAppUser,
  getClientStockCatalog,
  getClientBillingData,
  listAppData,
  updateAppClient,
  updateClientStockCatalog,
  updateClientBillingData,
  updateAppUser,
  upsertAppClient,
  upsertAppUser
} from "../controllers/appData.controller.js";
import { requireAppDataSession } from "../middleware/appDataAuth.js";
import { authRateLimiter } from "../middleware/rateLimit.js";

const router = Router();

router.post("/login", authRateLimiter, appLogin);
router.use(requireAppDataSession);
router.get("/", listAppData);
router.get("/diagnostics", appDataDiagnostics);
router.post("/clients", upsertAppClient);
router.put("/clients/:id", updateAppClient);
router.delete("/clients/:id", deleteAppClient);
router.get("/clients/:id/stock-catalog", getClientStockCatalog);
router.put("/clients/:id/stock-catalog", updateClientStockCatalog);
router.get("/clients/:id/billing", getClientBillingData);
router.put("/clients/:id/billing", updateClientBillingData);
router.post("/users", upsertAppUser);
router.put("/users/:id", updateAppUser);
router.delete("/users/:id", deleteAppUser);

export default router;

