import { Router } from "express";
import mongoose from "mongoose";
import Exam from "../models/Exam.js";
import Attempt from "../models/Attempt.js";
import { auth } from "../middleware/auth.js";

const router = Router();

function publicExam(exam) {
  return {
    id: exam._id,
    title: exam.title,
    durationMinutes: exam.durationMinutes,
    questions: exam.questions.map(q => ({ id: q._id, text: q.text, options: q.options }))
  };
}

function calculateResult(exam, attempt, submittedAt) {
  let correct = 0, incorrect = 0, unanswered = 0, ungraded = 0, score = 0, maxScore = 0;
  for (const q of exam.questions) {
    const key = String(q._id);
    const answer = attempt.answers.get(key);
    if (q.correctIndex === null || q.correctIndex === undefined) {
      ungraded++;
      if (answer === undefined) unanswered++;
      continue;
    }
    maxScore += exam.marksPerQuestion;
    if (answer === undefined) unanswered++;
    else if (answer === q.correctIndex) { correct++; score += exam.marksPerQuestion; }
    else { incorrect++; score -= exam.negativeMarks; }
  }
  score = Math.max(0, Number(score.toFixed(2)));
  return {
    correct, incorrect, unanswered, ungraded, score, maxScore,
    percentage: maxScore ? Number((score / maxScore * 100).toFixed(2)) : 0,
    timeTakenSeconds: Math.max(0, Math.min(Math.floor((submittedAt - attempt.startedAt) / 1000), Math.floor((attempt.deadlineAt - attempt.startedAt) / 1000)))
  };
}

router.post("/start/:examId", auth, async (req, res, next) => {
  try {
    const exam = await Exam.findOne({ _id: req.params.examId, user: req.userId });
    if (!exam) return res.status(404).json({ message: "Test not found." });
    const now = new Date();
    const attempt = await Attempt.create({
      user: req.userId, exam: exam._id, examTitle: exam.title, startedAt: now,
      deadlineAt: new Date(now.getTime() + exam.durationMinutes * 60 * 1000)
    });
    res.status(201).json({ attempt: { id: attempt._id, startedAt: attempt.startedAt, deadlineAt: attempt.deadlineAt, answers: {} }, exam: publicExam(exam) });
  } catch (e) { next(e); }
});

router.get("/:id", auth, async (req, res, next) => {
  try {
    const attempt = await Attempt.findOne({ _id: req.params.id, user: req.userId });
    if (!attempt) return res.status(404).json({ message: "Attempt not found." });
    if (attempt.status === "in-progress" && Date.now() >= attempt.deadlineAt.getTime()) {
      const exam = await Exam.findOne({ _id: attempt.exam, user: req.userId });
      if (exam) {
        const submittedAt = attempt.deadlineAt;
        attempt.result = calculateResult(exam, attempt, submittedAt);
        attempt.status = "submitted";
        attempt.submittedAt = submittedAt;
        await attempt.save();
      }
    }
    const exam = await Exam.findOne({ _id: attempt.exam, user: req.userId });
    res.json({
      attempt: { id: attempt._id, status: attempt.status, startedAt: attempt.startedAt, deadlineAt: attempt.deadlineAt, submittedAt: attempt.submittedAt, answers: Object.fromEntries(attempt.answers), result: attempt.result },
      exam: exam ? (attempt.status === "submitted" ? { ...publicExam(exam), questions: exam.questions.map(q => ({ id: q._id, text: q.text, options: q.options, correctIndex: q.correctIndex, explanation: q.explanation })) } : publicExam(exam)) : null
    });
  } catch (e) { next(e); }
});

router.put("/:id/answers", auth, async (req, res, next) => {
  try {
    const attempt = await Attempt.findOne({ _id: req.params.id, user: req.userId, status: "in-progress" });
    if (!attempt) return res.status(404).json({ message: "Active attempt not found." });
    if (Date.now() >= attempt.deadlineAt.getTime()) return res.status(409).json({ message: "Time is up. Submit the test to see your result." });
    const exam = await Exam.findOne({ _id: attempt.exam, user: req.userId });
    if (!exam) return res.status(404).json({ message: "Test not found." });
    const answers = req.body.answers || {};
    for (const [qid, value] of Object.entries(answers)) {
      const question = exam.questions.id(qid);
      if (!question) return res.status(400).json({ message: "Invalid question in answer submission." });
      if (value === null || value === undefined || value === "") attempt.answers.delete(qid);
      else {
        const n = Number(value);
        if (!Number.isInteger(n) || n < 0 || n >= question.options.length) return res.status(400).json({ message: "Invalid option selected." });
        attempt.answers.set(qid, n);
      }
    }
    await attempt.save();
    res.json({ message: "Answers saved.", answers: Object.fromEntries(attempt.answers) });
  } catch (e) { next(e); }
});

router.post("/:id/submit", auth, async (req, res, next) => {
  try {
    const attempt = await Attempt.findOne({ _id: req.params.id, user: req.userId });
    if (!attempt) return res.status(404).json({ message: "Attempt not found." });
    if (attempt.status === "submitted") return res.json({ attempt });
    const exam = await Exam.findOne({ _id: attempt.exam, user: req.userId });
    if (!exam) return res.status(404).json({ message: "Test not found." });
    const now = new Date();
    const submittedAt = now > attempt.deadlineAt ? attempt.deadlineAt : now;
    attempt.result = calculateResult(exam, attempt, submittedAt);
    attempt.status = "submitted";
    attempt.submittedAt = submittedAt;
    await attempt.save();
    res.json({ attempt: { id: attempt._id, status: attempt.status, submittedAt: attempt.submittedAt, result: attempt.result } });
  } catch (e) { next(e); }
});

router.get("/history/list", auth, async (req, res, next) => {
  try {
    const attempts = await Attempt.find({ user: req.userId }).sort({ createdAt: -1 }).limit(100);
    res.json({ attempts: attempts.map(a => ({ id: a._id, examTitle: a.examTitle, status: a.status, startedAt: a.startedAt, submittedAt: a.submittedAt, result: a.result })) });
  } catch (e) { next(e); }
});

export default router;
