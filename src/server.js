const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// In-memory storage (temporary DB)
// ----------------------------
let groups = [];

// Health Check
app.get("/", (req, res) => {
  res.send("Study Groups API is running");
});

// Create Group
app.post("/api/groups", (req, res) => {
  const { name } = req.body;

  if (!name || name.trim() === "") {
    return res.status(400).json({
      success: false,
      message: "Group name is required"
    });
  }

  const newGroup = {
    id: Date.now().toString(),
    name,
    members: [],
    goals: []
  };

  groups.push(newGroup);

  return res.status(201).json({
    success: true,
    data: newGroup
  });
});

// Get All Groups
app.get("/api/groups", (req, res) => {
  return res.json({
    success: true,
    data: groups
  });
});

// Add Member
app.post("/api/groups/:groupId/members", (req, res) => {
  const { groupId } = req.params;
  const { memberId } = req.body;

  const group = groups.find(g => g.id === groupId);

  if (!group) {
    return res.status(404).json({
      success: false,
      message: "Group not found"
    });
  }

  if (!memberId) {
    return res.status(400).json({
      success: false,
      message: "memberId is required"
    });
  }

  if (group.members.includes(memberId)) {
    return res.status(400).json({
      success: false,
      message: "Member already exists"
    });
  }

  group.members.push(memberId);

  return res.json({
    success: true,
    data: group
  });
});

// Create Goal
app.post("/api/groups/:groupId/goals", (req, res) => {
  const { groupId } = req.params;
  const { title, target } = req.body;

  const group = groups.find(g => g.id === groupId);

  if (!group) {
    return res.status(404).json({
      success: false,
      message: "Group not found"
    });
  }

  if (!title || !target) {
    return res.status(400).json({
      success: false,
      message: "title and target are required"
    });
  }

  const newGoal = {
    id: Date.now().toString(),
    title,
    target,
    progress: 0
  };

  group.goals.push(newGoal);

  return res.status(201).json({
    success: true,
    data: newGoal
  });
});

// Update Progress
app.post("/api/groups/:groupId/goals/:goalId/progress", (req, res) => {
  const { groupId, goalId } = req.params;
  const { progress } = req.body;

  const group = groups.find(g => g.id === groupId);

  if (!group) {
    return res.status(404).json({
      success: false,
      message: "Group not found"
    });
  }

  const goal = group.goals.find(g => g.id === goalId);

  if (!goal) {
    return res.status(404).json({
      success: false,
      message: "Goal not found"
    });
  }

  if (typeof progress !== "number") {
    return res.status(400).json({
      success: false,
      message: "Progress must be a number"
    });
  }

  goal.progress += progress;

  return res.json({
    success: true,
    data: goal
  });
});

// Leaderboard
app.get("/api/leaderboard", (req, res) => {
  const leaderboard = groups.map(group => {
    let totalTarget = 0;
    let totalProgress = 0;

    group.goals.forEach(goal => {
      totalTarget += goal.target;
      totalProgress += goal.progress;
    });

    const score =
      totalTarget === 0 ? 0 : (totalProgress / totalTarget) * 100;

    return {
      groupId: group.id,
      name: group.name,
      score: score.toFixed(2)
    };
  });

  leaderboard.sort((a, b) => b.score - a.score);

  return res.json({
    success: true,
    data: leaderboard
  });
});

// Start Server
app.listen(4000, "0.0.0.0", () => {
  console.log("Server running on port 4000");
});