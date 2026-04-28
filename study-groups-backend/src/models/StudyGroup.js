const mongoose = require("mongoose");

const StudyGroupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: ""
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],
    activeGoal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GroupGoal",
      default: null
    },
    isArchived: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// One creator can own only one study group.
StudyGroupSchema.index({ creator: 1 }, { unique: true });
StudyGroupSchema.index({ members: 1 });
StudyGroupSchema.index({ isArchived: 1, createdAt: -1 });

module.exports = mongoose.model("StudyGroup", StudyGroupSchema);
