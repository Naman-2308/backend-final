const express = require("express");
const router = express.Router();
const groupController = require("../controllers/groupController");
const authMiddleware = require("../middlewares/auth");

// Protected routes
router.post("/", authMiddleware, groupController.createGroup);
router.post("/:id/member", authMiddleware, groupController.addMember);
router.post("/:id/goal", authMiddleware, groupController.createGoal);
router.post("/:id/goals", authMiddleware, groupController.createGoal);
router.put("/:id/goal/:goalId", authMiddleware, groupController.updateGoal);
router.put("/:id/goals/:goalId", authMiddleware, groupController.updateGoal);
router.post("/:id/activity", authMiddleware, groupController.recordActivity);
router.post("/:id/activities", authMiddleware, groupController.recordActivity);
router.get("/:id/leaderboard", authMiddleware, groupController.getLeaderboard);
router.get("/:id/progress", authMiddleware, groupController.getProgress);

module.exports = router;
