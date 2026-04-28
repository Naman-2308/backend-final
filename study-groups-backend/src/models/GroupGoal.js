const mongoose = require("mongoose");

const GOAL_STATUSES = ["active", "archived", "expired"];
const GOAL_METRICS = ["questionsSolved"];
const GOAL_TYPES = ["deadline", "recurring"];
const GOAL_FREQUENCIES = ["daily", "weekly", "monthly"];

const GroupGoalSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StudyGroup",
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    subjects: {
      type: [String],
      required: true,
      validate: {
        validator: (value) => Array.isArray(value) && value.length > 0,
        message: "At least one subject is required"
      },
      set: (value) =>
        value.map((subject) => subject.trim().toLowerCase()).filter(Boolean)
    },
    metric: {
      type: String,
      enum: GOAL_METRICS,
      default: "questionsSolved"
    },
    totalTarget: {
      type: Number,
      required: true,
      min: 1
    },
    goalType: {
      type: String,
      enum: GOAL_TYPES,
      required: true
    },
    deadline: {
      type: Date,
      default: null
    },
    recurringFrequency: {
      type: String,
      enum: GOAL_FREQUENCIES,
      default: null
    },
    windowStart: {
      type: Date,
      required: true
    },
    windowEnd: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: GOAL_STATUSES,
      default: "active"
    },
    archivedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

GroupGoalSchema.pre("validate", function setGoalWindow() {
  if (this.goalType === "deadline") {
    this.recurringFrequency = null;
    this.windowEnd = this.deadline;
  }

  if (this.goalType === "recurring") {
    this.deadline = null;
  }
});

// Only one active goal is allowed per group.
GroupGoalSchema.index(
  { groupId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "active" }
  }
);

GroupGoalSchema.index({ groupId: 1, createdAt: -1 });
GroupGoalSchema.index({ groupId: 1, windowStart: 1, windowEnd: 1 });
GroupGoalSchema.index({ status: 1, windowEnd: 1 });

module.exports = mongoose.model("GroupGoal", GroupGoalSchema);
