import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import postRoutes from "./routes/postRoutes.js";

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

const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`Social Media Studio API running on port ${PORT}`);
  });
}

export default app;