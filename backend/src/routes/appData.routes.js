import { Router } from "express";
import {
  appLogin,
  appDataDiagnostics,
  deleteAppClient,
  deleteAppUser,
  getClientStockCatalog,
  listAppData,
  updateAppClient,
  updateClientStockCatalog,
  updateAppUser,
  upsertAppClient,
  upsertAppUser
} from "../controllers/appData.controller.js";

const router = Router();

router.get("/", listAppData);
router.get("/diagnostics", appDataDiagnostics);
router.post("/login", appLogin);
router.post("/clients", upsertAppClient);
router.put("/clients/:id", updateAppClient);
router.delete("/clients/:id", deleteAppClient);
router.get("/clients/:id/stock-catalog", getClientStockCatalog);
router.put("/clients/:id/stock-catalog", updateClientStockCatalog);
router.post("/users", upsertAppUser);
router.put("/users/:id", updateAppUser);
router.delete("/users/:id", deleteAppUser);

export default router;
