const GroupGoal = require("../models/GroupGoal");

const archiveExpiredGoals = async () => {
  const now = new Date();

  await GroupGoal.updateMany(
    {
      status: "active",
      windowEnd: { $lt: now }
    },
    {
      $set: { status: "archived" }
    }
  );
};

module.exports = { archiveExpiredGoals };