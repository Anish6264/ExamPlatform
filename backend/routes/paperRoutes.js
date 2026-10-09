import { Router } from "express";
import multer from "multer";
import { auth } from "../middleware/auth.js";
import { extractQuestions } from "../services/pdfService.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== "application/pdf" && !file.originalname.toLowerCase().endsWith(".pdf")) {
      return cb(new Error("Upload a PDF file."));
    }
    cb(null, true);
  }
});

router.post("/parse", auth, upload.single("paper"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Choose a PDF file first." });
    const parsed = await extractQuestions(req.file.buffer);
    res.json(parsed);
  } catch (e) { next(e); }
});

export default router;
