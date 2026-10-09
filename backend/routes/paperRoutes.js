import { Router } from "express";
import multer from "multer";
import { auth } from "../middleware/auth.js";
import {
  extractAnswerKey,
  extractQuestions
} from "../services/pdfService.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 12 * 1024 * 1024,
    files: 1
  },
  fileFilter: (_req, file, cb) => {
    const isPdf =
      file.mimetype === "application/pdf" ||
      file.originalname.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      return cb(new Error("Upload a PDF file."));
    }

    cb(null, true);
  }
});

router.post(
  "/parse",
  auth,
  upload.single("paper"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: "Choose a question paper PDF first."
        });
      }

      const parsed = await extractQuestions(req.file.buffer);

      res.json(parsed);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/parse-answer-key",
  auth,
  upload.single("answerKey"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: "Choose an answer-key PDF first."
        });
      }

      const parsed = await extractAnswerKey(req.file.buffer);

      res.json(parsed);
    } catch (error) {
      next(error);
    }
  }
);

export default router;