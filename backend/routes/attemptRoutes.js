import { Router } from "express";
import mongoose from "mongoose";
import Exam from "../models/Exam.js";
import Attempt from "../models/Attempt.js";
import { auth } from "../middleware/auth.js";

const router = Router();

function publicExam(exam, revealAnswers = false) {
  return {
    id: exam._id,
    title: exam.title,
    subject: exam.subject,
    year: exam.year,
    durationMinutes: exam.durationMinutes,
    questions: exam.questions.map(question => ({
      id: question._id,
      text: question.text,
      options: question.options,
      ...(revealAnswers
        ? {
            correctIndex: question.correctIndex,
            explanation: question.explanation
          }
        : {})
    }))
  };
}

function canAccessExam(exam, userId) {
  return Boolean(
    exam &&
    (
      exam.isPublic ||
      String(exam.user) === String(userId)
    )
  );
}

function calculateResult(exam, attempt, submittedAt) {
  let correct = 0;
  let incorrect = 0;
  let unanswered = 0;
  let ungraded = 0;
  let score = 0;
  let maxScore = 0;

  for (const question of exam.questions) {
    const questionId = String(question._id);
    const answer = attempt.answers.get(questionId);

    if (
      question.correctIndex === null ||
      question.correctIndex === undefined
    ) {
      ungraded++;

      if (answer === undefined) unanswered++;
      continue;
    }

    maxScore += exam.marksPerQuestion;

    if (answer === undefined) {
      unanswered++;
    } else if (answer === question.correctIndex) {
      correct++;
      score += exam.marksPerQuestion;
    } else {
      incorrect++;
      score -= exam.negativeMarks;
    }
  }

  score = Math.max(0, Number(score.toFixed(2)));

  return {
    correct,
    incorrect,
    unanswered,
    ungraded,
    score,
    maxScore,
    percentage: maxScore
      ? Number((score / maxScore * 100).toFixed(2))
      : 0,
    timeTakenSeconds: Math.max(
      0,
      Math.min(
        Math.floor((submittedAt - attempt.startedAt) / 1000),
        Math.floor(
          (attempt.deadlineAt - attempt.startedAt) / 1000
        )
      )
    )
  };
}

// Start an exam.
router.post("/start/:examId", auth, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.examId)) {
      return res.status(404).json({ message: "Test not found." });
    }

    const exam = await Exam.findById(req.params.examId);

    if (!canAccessExam(exam, req.userId)) {
      return res.status(404).json({ message: "Test not found." });
    }

    const missingAnswerIndex = exam.questions.findIndex(
      question =>
        question.correctIndex === null ||
        question.correctIndex === undefined
    );

    if (missingAnswerIndex !== -1) {
      return res.status(409).json({
        message:
          "This paper's answer key is incomplete and it cannot be attempted yet."
      });
    }

    const now = new Date();

    const attempt = await Attempt.create({
      user: req.userId,
      exam: exam._id,
      examTitle: exam.title,
      startedAt: now,
      deadlineAt: new Date(
        now.getTime() + exam.durationMinutes * 60 * 1000
      )
    });

    res.status(201).json({
      attempt: {
        id: attempt._id,
        startedAt: attempt.startedAt,
        deadlineAt: attempt.deadlineAt,
        answers: {}
      },
      exam: publicExam(exam)
    });
  } catch (error) {
    next(error);
  }
});

// My Results: attempts made by the logged-in user.
router.get("/history/list", auth, async (req, res, next) => {
  try {
    const attempts = await Attempt.find({ user: req.userId })
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({
      attempts: attempts.map(attempt => ({
        id: attempt._id,
        examTitle: attempt.examTitle,
        status: attempt.status,
        startedAt: attempt.startedAt,
        submittedAt: attempt.submittedAt,
        result: attempt.result
      }))
    });
  } catch (error) {
    next(error);
  }
});

// Fetch an attempt. Correct answers are only returned after submission.
router.get("/:id", auth, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Attempt not found." });
    }

    const attempt = await Attempt.findOne({
      _id: req.params.id,
      user: req.userId
    });

    if (!attempt) {
      return res.status(404).json({ message: "Attempt not found." });
    }

    const exam = await Exam.findById(attempt.exam);

    if (!exam || !canAccessExam(exam, req.userId)) {
      return res.status(404).json({ message: "Test not found." });
    }

    if (
      attempt.status === "in-progress" &&
      Date.now() >= attempt.deadlineAt.getTime()
    ) {
      const submittedAt = attempt.deadlineAt;

      attempt.result = calculateResult(
        exam,
        attempt,
        submittedAt
      );

      attempt.status = "submitted";
      attempt.submittedAt = submittedAt;

      await attempt.save();
    }

    res.json({
      attempt: {
        id: attempt._id,
        status: attempt.status,
        startedAt: attempt.startedAt,
        deadlineAt: attempt.deadlineAt,
        submittedAt: attempt.submittedAt,
        answers: Object.fromEntries(attempt.answers),
        result: attempt.result
      },
      exam: publicExam(
        exam,
        attempt.status === "submitted"
      )
    });
  } catch (error) {
    next(error);
  }
});

// Save answers while the attempt is active.
router.put("/:id/answers", auth, async (req, res, next) => {
  try {
    const attempt = await Attempt.findOne({
      _id: req.params.id,
      user: req.userId,
      status: "in-progress"
    });

    if (!attempt) {
      return res.status(404).json({
        message: "Active attempt not found."
      });
    }

    if (Date.now() >= attempt.deadlineAt.getTime()) {
      return res.status(409).json({
        message: "Time is up. Submit the test to see your result."
      });
    }

    const exam = await Exam.findById(attempt.exam);

    if (!exam || !canAccessExam(exam, req.userId)) {
      return res.status(404).json({ message: "Test not found." });
    }

    const answers = req.body.answers || {};

    for (const [questionId, value] of Object.entries(answers)) {
      const question = exam.questions.id(questionId);

      if (!question) {
        return res.status(400).json({
          message: "Invalid question in answer submission."
        });
      }

      if (value === null || value === undefined || value === "") {
        attempt.answers.delete(questionId);
      } else {
        const selectedIndex = Number(value);

        if (
          !Number.isInteger(selectedIndex) ||
          selectedIndex < 0 ||
          selectedIndex >= question.options.length
        ) {
          return res.status(400).json({
            message: "Invalid option selected."
          });
        }

        attempt.answers.set(questionId, selectedIndex);
      }
    }

    await attempt.save();

    res.json({
      message: "Answers saved.",
      answers: Object.fromEntries(attempt.answers)
    });
  } catch (error) {
    next(error);
  }
});

// Submit the test and calculate the result.
router.post("/:id/submit", auth, async (req, res, next) => {
  try {
    const attempt = await Attempt.findOne({
      _id: req.params.id,
      user: req.userId
    });

    if (!attempt) {
      return res.status(404).json({ message: "Attempt not found." });
    }

    if (attempt.status === "submitted") {
      return res.json({
        attempt: {
          id: attempt._id,
          status: attempt.status,
          submittedAt: attempt.submittedAt,
          result: attempt.result
        }
      });
    }

    const exam = await Exam.findById(attempt.exam);

    if (!exam || !canAccessExam(exam, req.userId)) {
      return res.status(404).json({ message: "Test not found." });
    }

    const now = new Date();

    const submittedAt =
      now > attempt.deadlineAt
        ? attempt.deadlineAt
        : now;

    attempt.result = calculateResult(
      exam,
      attempt,
      submittedAt
    );

    attempt.status = "submitted";
    attempt.submittedAt = submittedAt;

    await attempt.save();

    res.json({
      attempt: {
        id: attempt._id,
        status: attempt.status,
        submittedAt: attempt.submittedAt,
        result: attempt.result
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;