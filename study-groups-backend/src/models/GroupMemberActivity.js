const mongoose = require("mongoose");

const GroupMemberActivitySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StudyGroup",
      required: true
    },
    goalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GroupGoal",
      required: true
    },
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Question",
      required: true
    },
    subject: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    status: {
      type: String,
      enum: ["solved"],
      default: "solved"
    },
    timeSpent: {
      type: Number,
      required: true,
      min: 0
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// The same user solving the same question for the same goal counts once.
GroupMemberActivitySchema.index(
  { goalId: 1, userId: 1, questionId: 1 },
  { unique: true }
);

GroupMemberActivitySchema.index({ groupId: 1, goalId: 1, timestamp: -1 });
GroupMemberActivitySchema.index({ groupId: 1, goalId: 1, userId: 1 });
GroupMemberActivitySchema.index({ groupId: 1, goalId: 1, subject: 1 });

module.exports = mongoose.model("GroupMemberActivity", GroupMemberActivitySchema);
