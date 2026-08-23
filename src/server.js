import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import postRoutes from "./routes/postRoutes.js";
import platformRoutes from "./routes/platformRoutes.js";
import variantRoutes from "./routes/variantRoutes.js";
import scheduleRoutes from "./routes/scheduleRoutes.js";
import metricsRoutes from "./routes/metricsRoutes.js";
import publishHistoryRoutes from "./routes/publishHistoryRoutes.js";
import { startScheduler } from "./scheduler/scheduler.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    name: "FlyRank AI Social Media Studio",
    status: "running"
  });
});

app.use("/api/posts", postRoutes);
app.use("/api/platforms", platformRoutes);
app.use("/api/variants", variantRoutes);
app.use("/api/schedules", scheduleRoutes);
app.use("/api/metrics", metricsRoutes);
app.use("/api/publish-history", publishHistoryRoutes);

const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`Social Media Studio API running on port ${PORT}`);
    startScheduler();
    console.log("Publishing scheduler started");
  });
}

export default app;
