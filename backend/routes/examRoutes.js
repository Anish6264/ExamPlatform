import { Router } from "express";
import mongoose from "mongoose";
import Exam from "../models/Exam.js";
import Attempt from "../models/Attempt.js";
import { auth } from "../middleware/auth.js";

const router = Router();

function cleanQuestions(input) {
  if (!Array.isArray(input) || input.length < 1 || input.length > 300) {
    throw new Error("Add between 1 and 300 questions.");
  }

  return input.map((question, index) => {
    const text = String(question.text || "").trim();

    const options = Array.isArray(question.options)
      ? question.options.map(option => String(option || "").trim())
      : [];

    if (!text || options.length < 2 || options.some(option => !option)) {
      throw new Error(
        `Question ${index + 1} needs text and at least two non-empty options.`
      );
    }

    const raw = question.correctIndex;

    const correctIndex =
      raw === null || raw === undefined || raw === ""
        ? null
        : Number(raw);

    if (
      correctIndex !== null &&
      (
        !Number.isInteger(correctIndex) ||
        correctIndex < 0 ||
        correctIndex >= options.length
      )
    ) {
      throw new Error(`Question ${index + 1} has an invalid answer key.`);
    }

    return {
      text,
      options,
      correctIndex,
      explanation: String(question.explanation || "").trim()
    };
  });
}

function publicExamSummary(exam) {
  return {
    id: exam._id,
    title: exam.title,
    subject: exam.subject,
    year: exam.year,
    description: exam.description,
    isPublic: exam.isPublic,
    durationMinutes: exam.durationMinutes,
    questionCount: exam.questions.length,
    hasAnswerKey:
      exam.questions.length > 0 &&
      exam.questions.every(
        question =>
          question.correctIndex !== null &&
          question.correctIndex !== undefined
      ),
    answerKeyStatus: exam.answerKeyStatus || "missing",
    createdAt: exam.createdAt,
    updatedAt: exam.updatedAt
  };
}

// Published papers in the public library.
router.get("/public", auth, async (req, res, next) => {
  try {
    const filter = { isPublic: true };

    const search = String(req.query.search || "").trim().slice(0, 100);
    const subject = String(req.query.subject || "").trim().slice(0, 100);
    const year = Number(req.query.year);

    const escapeRegex = value =>
      value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    if (search) {
      const safeSearch = escapeRegex(search);

      filter.$or = [
        { title: { $regex: safeSearch, $options: "i" } },
        { subject: { $regex: safeSearch, $options: "i" } },
        { description: { $regex: safeSearch, $options: "i" } }
      ];
    }

    if (subject) {
      filter.subject = {
        $regex: escapeRegex(subject),
        $options: "i"
      };
    }

    if (
      req.query.year &&
      Number.isInteger(year) &&
      year >= 1900 &&
      year <= 2200
    ) {
      filter.year = year;
    }

    const exams = await Exam.find(filter)
      .select(
        "title subject year description durationMinutes questions isPublic answerKeyStatus answerKeyFileName createdAt updatedAt"
      )
      .sort({ createdAt: -1 })
      .limit(200);

    const ids = exams.map(exam => exam._id);

    const counts = ids.length
      ? await Attempt.aggregate([
          { $match: { exam: { $in: ids } } },
          { $group: { _id: "$exam", count: { $sum: 1 } } }
        ])
      : [];

    const countMap = new Map(
      counts.map(item => [String(item._id), item.count])
    );

    res.json({
      exams: exams.map(exam => ({
        ...publicExamSummary(exam),
        attemptCount: countMap.get(String(exam._id)) || 0
      }))
    });
  } catch (error) {
    next(error);
  }
});

// Papers created by the logged-in user.
router.get("/", auth, async (req, res, next) => {
  try {
    const exams = await Exam.find({ user: req.userId })
      .select(
        "title subject year description isPublic durationMinutes questions answerKeyStatus answerKeyFileName createdAt updatedAt"
      )
      .sort({ updatedAt: -1 });

    const counts = await Attempt.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(String(req.userId))
        }
      },
      { $group: { _id: "$exam", count: { $sum: 1 } } }
    ]);

    const countMap = new Map(
      counts.map(item => [String(item._id), item.count])
    );

    res.json({
      exams: exams.map(exam => ({
        ...publicExamSummary(exam),
        attemptCount: countMap.get(String(exam._id)) || 0
      }))
    });
  } catch (error) {
    next(error);
  }
});

// Get one paper. Hide its answer key from other users before submission.
router.get("/:id", auth, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Exam not found." });
    }

    const exam = await Exam.findById(req.params.id);

    if (
      !exam ||
      (!exam.isPublic && String(exam.user) !== String(req.userId))
    ) {
      return res.status(404).json({ message: "Exam not found." });
    }

    if (String(exam.user) !== String(req.userId)) {
      return res.json({
        exam: {
          ...publicExamSummary(exam),
          questions: exam.questions.map(question => ({
            id: question._id,
            text: question.text,
            options: question.options,
            hasAnswerKey:
              question.correctIndex !== null &&
              question.correctIndex !== undefined
          }))
        }
      });
    }

    res.json({ exam });
  } catch (error) {
    next(error);
  }
});

// Create a paper. An answer-key PDF filename and all correct answers are required.
router.post("/", auth, async (req, res, next) => {
  try {
    const title = String(req.body.title || "").trim();
    const subject = String(req.body.subject || "").trim();
    const description = String(req.body.description || "").trim();

    const rawYear =
      req.body.year === "" ||
      req.body.year === null ||
      req.body.year === undefined
        ? null
        : Number(req.body.year);

    const year = rawYear;
    const isPublic = req.body.isPublic === true;
    const durationMinutes = Number(req.body.durationMinutes);
    const marksPerQuestion = Number(req.body.marksPerQuestion ?? 1);
    const negativeMarks = Number(req.body.negativeMarks ?? 0);

    if (!title) {
      return res.status(400).json({
        message: "Enter an exam name or test title."
      });
    }

    if (subject.length > 100 || description.length > 1000) {
      return res.status(400).json({
        message: "Subject or description is too long."
      });
    }

    if (
      year !== null &&
      (!Number.isInteger(year) || year < 1900 || year > 2200)
    ) {
      return res.status(400).json({
        message: "Enter a valid exam year."
      });
    }

    if (
      !Number.isInteger(durationMinutes) ||
      durationMinutes < 1 ||
      durationMinutes > 600
    ) {
      return res.status(400).json({
        message: "Duration must be 1–600 minutes."
      });
    }

    if (
      !Number.isFinite(marksPerQuestion) ||
      marksPerQuestion < 0 ||
      marksPerQuestion > 100 ||
      !Number.isFinite(negativeMarks) ||
      negativeMarks < 0 ||
      negativeMarks > 100
    ) {
      return res.status(400).json({
        message: "Invalid marking settings."
      });
    }

    const answerKeyFileName = String(
      req.body.answerKeyFileName || ""
    ).trim().slice(0, 255);

    if (!answerKeyFileName) {
      return res.status(400).json({
        message: "Upload an answer-key PDF before saving this paper."
      });
    }

    const questions = cleanQuestions(req.body.questions);

    const missingAnswerIndex = questions.findIndex(
      question =>
        question.correctIndex === null ||
        question.correctIndex === undefined
    );

    if (missingAnswerIndex !== -1) {
      return res.status(400).json({
        message:
          `Set the correct answer for question ${missingAnswerIndex + 1} before saving.`
      });
    }

    const exam = await Exam.create({
      user: req.userId,
      title,
      subject,
      year,
      description,
      isPublic,
      answerKeyStatus: "user-provided",
      answerKeyFileName,
      durationMinutes,
      marksPerQuestion,
      negativeMarks,
      questions
    });

    res.status(201).json({
      exam: {
        ...publicExamSummary(exam),
        user: exam.user
      }
    });
  } catch (error) {
    if (
      error.message.startsWith("Add between") ||
      error.message.startsWith("Question ")
    ) {
      return res.status(400).json({ message: error.message });
    }

    next(error);
  }
});

// Delete only a paper owned by the logged-in user.
router.delete("/:id", auth, async (req, res, next) => {
  try {
    const exam = await Exam.findOneAndDelete({
      _id: req.params.id,
      user: req.userId
    });

    if (!exam) {
      return res.status(404).json({ message: "Exam not found." });
    }

    await Attempt.deleteMany({
      exam: exam._id,
      user: req.userId,
      status: "in-progress"
    });

    res.json({ message: "Test deleted." });
  } catch (error) {
    next(error);
  }
});

export default router;