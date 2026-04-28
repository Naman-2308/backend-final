const mongoose = require("mongoose");

const QuestionSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true
    },
    // Kept for backward compatibility with older seeded documents.
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      default: null
    },
    subject: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    topic: {
      type: String,
      trim: true,
      default: ""
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium"
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

QuestionSchema.index({ subjectId: 1 });
QuestionSchema.index({ subject: 1, difficulty: 1 });

module.exports = mongoose.model("Question", QuestionSchema);
