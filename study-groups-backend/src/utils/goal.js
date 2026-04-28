const GroupGoal = require("../models/GroupGoal");

const MS_IN_DAY = 24 * 60 * 60 * 1000;

const normalizeSubjects = (subjects) => {
  if (!Array.isArray(subjects)) {
    return [];
  }

  return [...new Set(subjects.map((subject) => subject.trim().toLowerCase()).filter(Boolean))];
};

const computeRecurringWindowEnd = (windowStart, recurringFrequency) => {
  const start = new Date(windowStart);

  if (recurringFrequency === "daily") {
    return new Date(start.getTime() + MS_IN_DAY);
  }

  if (recurringFrequency === "weekly") {
    return new Date(start.getTime() + 7 * MS_IN_DAY);
  }

  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  return end;
};

const archiveExpiredGoals = async (groupId) => {
  const now = new Date();

  await GroupGoal.updateMany(
    {
      groupId,
      status: "active",
      windowEnd: { $lt: now }
    },
    {
      $set: {
        status: "archived",
        archivedAt: now
      }
    }
  );
};

const getActiveGoalForGroup = async (groupId) => {
  await archiveExpiredGoals(groupId);

  return GroupGoal.findOne({
    groupId,
    status: "active"
  });
};

module.exports = {
  normalizeSubjects,
  computeRecurringWindowEnd,
  archiveExpiredGoals,
  getActiveGoalForGroup
};
