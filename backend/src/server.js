import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes.js";
import companyRoutes from "./routes/company.routes.js";
import accessRoutes from "./routes/access.routes.js";
import stockRoutes from "./routes/stock.routes.js";
import labelRoutes from "./routes/label.routes.js";
import checklistRoutes from "./routes/checklist.routes.js";
import uploadRoutes from "./routes/upload.routes.js";

dotenv.config();

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || "*", credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev"));

app.get("/", (req, res) => res.json({ name: "Gestão à Mesa API", status: "online" }));

app.use("/auth", authRoutes);
app.use("/companies", companyRoutes);
app.use("/access", accessRoutes);
app.use("/stock", stockRoutes);
app.use("/labels", labelRoutes);
app.use("/checklist", checklistRoutes);
app.use("/uploads", uploadRoutes);

const port = process.env.PORT || 10000;
app.listen(port, () => console.log(`API running on port ${port}`));
