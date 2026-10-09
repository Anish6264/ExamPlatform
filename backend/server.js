import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDB } from "./config/db.js";

import authRoutes from "./routes/authRoutes.js";
import paperRoutes from "./routes/paperRoutes.js";
import examRoutes from "./routes/examRoutes.js";
import attemptRoutes from "./routes/attemptRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import adminAuthRoutes from "./routes/adminAuthRoutes.js";

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173"
  })
);

app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/papers", paperRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/attempts", attemptRoutes);

// Password verification and admin session validation.
app.use("/api/admin-auth", adminAuthRoutes);

// All answer-key management endpoints require adminAuth.
app.use("/api/admin", adminRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);

  const status =
    err.name === "MulterError" ? 400 : 500;

  res.status(status).json({
    message: err.message || "Server error."
  });
});

const port = Number(process.env.PORT || 5000);

connectDB()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server is running on ${port}`);
    });
  })
  .catch(err => {
    console.error(
      "Failed to start server:",
      err.message
    );
    process.exit(1);
  });