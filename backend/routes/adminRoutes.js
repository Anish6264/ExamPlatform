import { Router } from "express";
import mongoose from "mongoose";
import Exam from "../models/Exam.js";
import Attempt from "../models/Attempt.js";
import User from "../models/User.js";
import { adminAuth } from "../middleware/auth.js";

const router = Router();
router.use(adminAuth);

function getAnswerKeyStatus(exam) {
  if (exam.answerKeyStatus === "admin-verified") return "admin-verified";
  return exam.questions.some(q => (q.questionType || "mcq") === "mcq" ? q.correctIndex !== null && q.correctIndex !== undefined : Boolean(String(q.correctValue || "").trim()))
    ? "user-provided"
    : "missing";
}

function summarize(exam, attemptCount = 0) {
  const status = getAnswerKeyStatus(exam);
  return {
    id: String(exam._id),
    title: exam.title,
    subject: exam.subject || "",
    year: exam.year ?? null,
    description: exam.description || "",
    creatorId: String(exam.user),
    durationMinutes: exam.durationMinutes,
    questionCount: exam.questions.length,
    answeredCount: exam.questions.filter(q => (q.questionType || "mcq") === "mcq" ? q.correctIndex !== null && q.correctIndex !== undefined : Boolean(String(q.correctValue || "").trim())).length,
    missingCount: exam.questions.filter(q => (q.questionType || "mcq") === "mcq" ? q.correctIndex === null || q.correctIndex === undefined : !String(q.correctValue || "").trim()).length,
    answerKeyStatus: status,
    attemptCount,
    createdAt: exam.createdAt
  };
}

// List published papers for admin review. Missing answer keys appear first.
router.get("/exams", async (_req, res, next) => {
  try {
    const exams = await Exam.find({ isPublic: true })
      .select("title subject year description user durationMinutes questions answerKeyStatus createdAt")
      .sort({ createdAt: -1 })
      .limit(500);
    const ids = exams.map(e => e._id);
    const counts = ids.length
      ? await Attempt.aggregate([{ $match: { exam: { $in: ids } } }, { $group: { _id: "$exam", count: { $sum: 1 } } }])
      : [];
    const countMap = new Map(counts.map(x => [String(x._id), x.count]));
    const creatorIds = [...new Set(exams.map(e => String(e.user)))];
    const creators = await User.find({ _id: { $in: creatorIds } }).select("name");
    const creatorNames = new Map(creators.map(user => [String(user._id), user.name]));
    const summaries = exams.map(e => ({ ...summarize(e, countMap.get(String(e._id)) || 0), uploaderName: creatorNames.get(String(e.user)) || "Unknown user" }));
    summaries.sort((a, b) => b.missingCount - a.missingCount || new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ exams: summaries });
  } catch (error) { next(error); }
});

// Full question list for the admin editor; includes answer keys only in this admin-only route.
router.get("/exams/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Paper not found." });
    const exam = await Exam.findOne({ _id: req.params.id, isPublic: true });
    if (!exam) return res.status(404).json({ message: "Published paper not found." });
    res.json({
      exam: {
        ...summarize(exam),
        marksPerQuestion: exam.marksPerQuestion,
        negativeMarks: exam.negativeMarks,
        questions: exam.questions.map(q => ({
          id: String(q._id), text: q.text, options: q.options,
          correctIndex: q.correctIndex ?? null, explanation: q.explanation || ""
        }))
      }
    });
  } catch (error) { next(error); }
});

// Save or correct an answer key. Admin verification status is set only by this endpoint.
router.put("/exams/:id/answer-key", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Paper not found." });
    const exam = await Exam.findOne({ _id: req.params.id, isPublic: true });
    if (!exam) return res.status(404).json({ message: "Published paper not found." });
    const answers = req.body.answers;
    if (!Array.isArray(answers)) return res.status(400).json({ message: "Answers must be an array." });

    const seen = new Set();
    for (const item of answers) {
      const questionId = String(item.questionId || "");
      if (!mongoose.isValidObjectId(questionId) || seen.has(questionId)) {
        return res.status(400).json({ message: "An answer contains an invalid or duplicate question ID." });
      }
      seen.add(questionId);
      const question = exam.questions.id(questionId);
      if (!question) return res.status(400).json({ message: "An answer refers to a question that does not belong to this paper." });
      if (item.correctIndex === null || item.correctIndex === "") {
        question.correctIndex = null;
      } else {
        const index = Number(item.correctIndex);
        if (!Number.isInteger(index) || index < 0 || index >= question.options.length) {
          return res.status(400).json({ message: `Choose a valid correct option for: ${question.text.slice(0, 80)}` });
        }
        question.correctIndex = index;
      }
      question.explanation = String(item.explanation || "").trim().slice(0, 3000);
    }

    const allHaveKeys = exam.questions.every(q => q.correctIndex !== null && q.correctIndex !== undefined);
    exam.answerKeyStatus = allHaveKeys ? "admin-verified" : (exam.questions.some(q => q.correctIndex !== null && q.correctIndex !== undefined) ? "user-provided" : "missing");
    await exam.save();
    res.json({ message: allHaveKeys ? "Answer key saved and verified." : "Answer key saved, but some questions still need answers.", exam: summarize(exam) });
  } catch (error) { next(error); }
});

// Remove a paper from the public library without destroying historical attempts.
router.delete("/exams/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Paper not found." });
    const exam = await Exam.findByIdAndUpdate(req.params.id, { $set: { isPublic: false } }, { new: true });
    if (!exam) return res.status(404).json({ message: "Paper not found." });
    res.json({ message: "Paper removed from the public library. Existing attempts have been preserved." });
  } catch (error) { next(error); }
});

export default router;
