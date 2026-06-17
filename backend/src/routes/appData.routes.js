import { Router } from "express";
import {
  appLogin,
  deleteAppClient,
  deleteAppUser,
  listAppData,
  updateAppClient,
  updateAppUser,
  upsertAppClient,
  upsertAppUser
} from "../controllers/appData.controller.js";

const router = Router();

router.get("/", listAppData);
router.post("/login", appLogin);
router.post("/clients", upsertAppClient);
router.put("/clients/:id", updateAppClient);
router.delete("/clients/:id", deleteAppClient);
router.post("/users", upsertAppUser);
router.put("/users/:id", updateAppUser);
router.delete("/users/:id", deleteAppUser);

export default router;
