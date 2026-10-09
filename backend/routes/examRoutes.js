import { Router } from "express";
import mongoose from "mongoose";
import Exam from "../models/Exam.js";
import Attempt from "../models/Attempt.js";
import { auth } from "../middleware/auth.js";

const router = Router();

function cleanQuestions(input) {
  if (!Array.isArray(input) || input.length < 1 || input.length > 300) throw new Error("Add between 1 and 300 questions.");
  return input.map((q, i) => {
    const text = String(q.text || "").trim();
    const options = Array.isArray(q.options) ? q.options.map(x => String(x || "").trim()) : [];
    if (!text || options.length < 2 || options.some(x => !x)) throw new Error(`Question ${i + 1} needs text and at least two non-empty options.`);
    const raw = q.correctIndex;
    const correctIndex = raw === null || raw === undefined || raw === "" ? null : Number(raw);
    if (correctIndex !== null && (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= options.length)) {
      throw new Error(`Question ${i + 1} has an invalid answer key.`);
    }
    return { text, options, correctIndex, explanation: String(q.explanation || "").trim() };
  });
}

router.get("/", auth, async (req, res, next) => {
  try {
    const exams = await Exam.find({ user: req.userId }).select("title durationMinutes questions createdAt updatedAt").sort({ updatedAt: -1 });
    const counts = await Attempt.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(String(req.userId)) } },
      { $group: { _id: "$exam", count: { $sum: 1 } } }
    ]);
    const map = new Map(counts.map(x => [String(x._id), x.count]));
    res.json({ exams: exams.map(e => ({ id: e._id, title: e.title, durationMinutes: e.durationMinutes, questionCount: e.questions.length, updatedAt: e.updatedAt, attemptCount: map.get(String(e._id)) || 0 })) });
  } catch (e) { next(e); }
});

router.get("/:id", auth, async (req, res, next) => {
  try {
    const exam = await Exam.findOne({ _id: req.params.id, user: req.userId });
    if (!exam) return res.status(404).json({ message: "Exam not found." });
    res.json({ exam });
  } catch (e) { next(e); }
});

router.post("/", auth, async (req, res, next) => {
  try {
    const title = String(req.body.title || "").trim();
    const durationMinutes = Number(req.body.durationMinutes);
    const marksPerQuestion = Number(req.body.marksPerQuestion ?? 1);
    const negativeMarks = Number(req.body.negativeMarks ?? 0);
    if (!title) return res.status(400).json({ message: "Enter a test title." });
    if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 600) return res.status(400).json({ message: "Duration must be 1–600 minutes." });
    if (!Number.isFinite(marksPerQuestion) || marksPerQuestion < 0 || marksPerQuestion > 100 || !Number.isFinite(negativeMarks) || negativeMarks < 0 || negativeMarks > 100) {
      return res.status(400).json({ message: "Invalid marking settings." });
    }
    const questions = cleanQuestions(req.body.questions);
    const exam = await Exam.create({ user: req.userId, title, durationMinutes, marksPerQuestion, negativeMarks, questions });
    res.status(201).json({ exam });
  } catch (e) {
    if (e.message.startsWith("Add between") || e.message.startsWith("Question ")) return res.status(400).json({ message: e.message });
    next(e);
  }
});

router.delete("/:id", auth, async (req, res, next) => {
  try {
    const exam = await Exam.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!exam) return res.status(404).json({ message: "Exam not found." });
    await Attempt.deleteMany({ exam: exam._id, user: req.userId, status: "in-progress" });
    res.json({ message: "Test deleted." });
  } catch (e) { next(e); }
});

export default router;
