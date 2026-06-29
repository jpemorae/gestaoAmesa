import express from "express";
import morgan from "morgan";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes.js";
import appDataRoutes from "./routes/appData.routes.js";
import companyRoutes from "./routes/company.routes.js";
import accessRoutes from "./routes/access.routes.js";
import stockRoutes from "./routes/stock.routes.js";
import labelRoutes from "./routes/label.routes.js";
import checklistRoutes from "./routes/checklist.routes.js";
import billingRoutes from "./routes/billing.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import { errorHandler, notFound } from "./middleware/error.js";
import { installInputSanitizers, installSecurityMiddleware } from "./middleware/security.js";
import { securityConfig } from "./config/security.js";

dotenv.config();

const app = express();

installSecurityMiddleware(app);
app.use(express.json({ limit: securityConfig.jsonBodyLimit }));
installInputSanitizers(app);
app.use(morgan("dev"));

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "gestao-a-mesa-api",
    timestamp: new Date().toISOString()
  });
});

app.get("/", (req, res) => res.json({ name: "GestÃ£o Ã  Mesa API", status: "online" }));

app.use("/auth", authRoutes);
app.use("/app-data", appDataRoutes);
app.use("/companies", companyRoutes);
app.use("/access", accessRoutes);
app.use("/stock", stockRoutes);
app.use("/labels", labelRoutes);
app.use("/checklist", checklistRoutes);
app.use("/billing", billingRoutes);
app.use("/uploads", uploadRoutes);

app.use(notFound);
app.use(errorHandler);

const port = process.env.PORT || 10000;
app.listen(port, () => console.log(`API running on port ${port}`));


