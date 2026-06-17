import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes.js";
import appDataRoutes from "./routes/appData.routes.js";
import companyRoutes from "./routes/company.routes.js";
import accessRoutes from "./routes/access.routes.js";
import stockRoutes from "./routes/stock.routes.js";
import labelRoutes from "./routes/label.routes.js";
import checklistRoutes from "./routes/checklist.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import { isAllowedOrigin } from "./config/security.js";
import { errorHandler, notFound } from "./middleware/error.js";

dotenv.config();

const app = express();

const corsOptions = {
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) return callback(null, true);
    return callback(new Error("Origem nao permitida pelo CORS."));
  },
  credentials: true,
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Company-Id"],
  maxAge: 86400
};

app.use(helmet());
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev"));

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "gestao-a-mesa-api",
    timestamp: new Date().toISOString()
  });
});

app.get("/", (req, res) => res.json({ name: "Gestão à Mesa API", status: "online" }));

app.use("/auth", authRoutes);
app.use("/app-data", appDataRoutes);
app.use("/companies", companyRoutes);
app.use("/access", accessRoutes);
app.use("/stock", stockRoutes);
app.use("/labels", labelRoutes);
app.use("/checklist", checklistRoutes);
app.use("/uploads", uploadRoutes);

app.use(notFound);
app.use(errorHandler);

const port = process.env.PORT || 10000;
app.listen(port, () => console.log(`API running on port ${port}`));
