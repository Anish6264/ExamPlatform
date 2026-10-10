import { Router } from "express";
import multer from "multer";
import { auth } from "../middleware/auth.js";
import {
  extractAnswerKey,
  extractQuestions,
  extractPdfText
} from "../services/pdfService.js";
import { structureQuestionsWithAI, extractAnswerKeyWithAI } from "../services/openRouterService.js";

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

      let parsed = await extractQuestions(req.file.buffer);
      if (process.env.OPENROUTER_API_KEY) {
        const text = await extractPdfText(req.file.buffer);
        const questions = await structureQuestionsWithAI(text.extractedText);
        // Prefer AI output when it detects additional questions or integer/numerical items.
        if (questions?.length && (questions.length >= (parsed.questions?.length || 0) || questions.some(q => q.type === "integer"))) {
          parsed = { ...text, questions, parser: "openrouter-assisted" };
        }
      }
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

      let parsed = await extractAnswerKey(req.file.buffer);
      if (process.env.OPENROUTER_API_KEY) {
        const text = await extractPdfText(req.file.buffer);
        const answers = await extractAnswerKeyWithAI(text.extractedText);
        if (answers?.length && answers.length >= (parsed.answers?.length || 0)) {
          parsed = { ...text, answers, parser: "openrouter-assisted" };
        }
      }
      res.json(parsed);
    } catch (error) {
      next(error);
    }
  }
);

export default router;