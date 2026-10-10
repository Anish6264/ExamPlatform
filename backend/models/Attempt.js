import mongoose from "mongoose";

const attemptSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  exam: { type: mongoose.Schema.Types.ObjectId, ref: "Exam", required: true },
  examTitle: { type: String, required: true },
  startedAt: { type: Date, required: true },
  deadlineAt: { type: Date, required: true },
  submittedAt: { type: Date, default: null },
  answers: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
  status: { type: String, enum: ["in-progress", "submitted"], default: "in-progress" },
  result: {
    correct: { type: Number, default: 0 },
    incorrect: { type: Number, default: 0 },
    unanswered: { type: Number, default: 0 },
    ungraded: { type: Number, default: 0 },
    score: { type: Number, default: 0 },
    maxScore: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    timeTakenSeconds: { type: Number, default: 0 }
  }
}, { timestamps: true });

export default mongoose.model("Attempt", attemptSchema);
