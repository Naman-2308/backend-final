const express = require("express");
const app = express();

app.use(express.json());

// routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/groups", require("./routes/groupRoutes"));
app.use("/api/leaderboard", require("./routes/leaderboardRoutes"));

module.exports = app;