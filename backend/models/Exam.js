import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    trim: true
  },
  questionType: { type: String, enum: ["mcq", "integer", "numeric"], default: "mcq" },
  options: { type: [String], default: [] },
  correctIndex: { type: Number, default: null },
  correctValue: { type: String, default: "", trim: true },
  answerTolerance: { type: Number, default: 0, min: 0 },
  explanation: {
    type: String,
    default: ""
  }
}, { _id: true });

const examSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 150
  },
  subject: {
    type: String,
    trim: true,
    maxlength: 100,
    default: ""
  },
  year: {
    type: Number,
    min: 1900,
    max: 2200,
    default: null
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000,
    default: ""
  },
  isPublic: {
    type: Boolean,
    default: false,
    index: true
  },
  answerKeyStatus: {
    type: String,
    enum: ["missing", "user-provided", "admin-verified"],
    default: "missing",
    index: true
  },
  answerKeyFileName: {
    type: String,
    trim: true,
    maxlength: 255,
    default: ""
  },
  durationMinutes: {
    type: Number,
    required: true,
    min: 1,
    max: 600,
    default: 60
  },
  marksPerQuestion: {
    type: Number,
    min: 0,
    max: 100,
    default: 1
  },
  negativeMarks: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  questions: {
    type: [questionSchema],
    validate: value => value.length > 0
  }
}, { timestamps: true });

export default mongoose.model("Exam", examSchema);