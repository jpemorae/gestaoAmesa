import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  createInventoryProduct,
  createProduct,
  inactivateInventoryProduct,
  inventoryDashboard,
  listInventoryLots,
  listInventoryLosses,
  listInventoryMovements,
  listInventoryProducts,
  listProducts,
  listStockLots,
  createStockEntry,
  registerInventoryEntry,
  registerInventoryExit,
  registerInventoryAdjustment,
  registerInventoryLoss,
  registerInventoryTransfer,
  updateInventoryProduct
} from "../controllers/stock.controller.js";
const router = Router();
router.use(requireAuth);
router.get("/products", listProducts);
router.post("/products", createProduct);
router.get("/lots", listStockLots);
router.post("/entries", createStockEntry);
router.get("/inventory/dashboard", inventoryDashboard);
router.get("/inventory/products", listInventoryProducts);
router.post("/inventory/products", createInventoryProduct);
router.put("/inventory/products/:id", updateInventoryProduct);
router.patch("/inventory/products/:id/inactivate", inactivateInventoryProduct);
router.get("/inventory/lots", listInventoryLots);
router.get("/inventory/movements", listInventoryMovements);
router.get("/inventory/losses", listInventoryLosses);
router.post("/inventory/entries", registerInventoryEntry);
router.post("/inventory/exits", registerInventoryExit);
router.post("/inventory/transfers", registerInventoryTransfer);
router.post("/inventory/inventory", registerInventoryAdjustment);
router.post("/inventory/losses", registerInventoryLoss);
export default router;
