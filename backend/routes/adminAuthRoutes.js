import { Router } from "express";
import jwt from "jsonwebtoken";
import { createHash, timingSafeEqual } from "node:crypto";
import { adminAuth } from "../middleware/auth.js";

const router = Router();

function sameSecret(actual, expected) {
  const actualHash = createHash("sha256")
    .update(String(actual))
    .digest();

  const expectedHash = createHash("sha256")
    .update(String(expected))
    .digest();

  return timingSafeEqual(actualHash, expectedHash);
}

router.post("/login", (req, res) => {
  const expectedPassword = process.env.ADMIN_PASSWORD;
  const jwtSecret =
    process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET;

  if (!expectedPassword || !jwtSecret) {
    return res.status(503).json({
      message:
        "Admin authentication is not configured. Check the backend .env file."
    });
  }

  const password =
    typeof req.body?.password === "string"
      ? req.body.password
      : "";

  if (!password || !sameSecret(password, expectedPassword)) {
    return res.status(401).json({
      message: "Incorrect admin password."
    });
  }

  const token = jwt.sign(
    { type: "admin" },
    jwtSecret,
    { expiresIn: "8h" }
  );

  return res.json({
    token,
    expiresIn: 28800
  });
});

router.get("/me", adminAuth, (_req, res) => {
  res.json({ authenticated: true });
});

export default router;