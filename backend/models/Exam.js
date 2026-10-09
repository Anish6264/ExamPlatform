import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
  text: { type: String, required: true, trim: true },
  options: { type: [String], validate: v => v.length >= 2 },
  correctIndex: { type: Number, default: null },
  explanation: { type: String, default: "" }
}, { _id: true });

const examSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 150 },
  durationMinutes: { type: Number, required: true, min: 1, max: 600, default: 60 },
  marksPerQuestion: { type: Number, min: 0, max: 100, default: 1 },
  negativeMarks: { type: Number, min: 0, max: 100, default: 0 },
  questions: { type: [questionSchema], validate: v => v.length > 0 }
}, { timestamps: true });

export default mongoose.model("Exam", examSchema);
