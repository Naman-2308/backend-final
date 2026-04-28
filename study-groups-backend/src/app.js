const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();

// ALWAYS before routes:
app.use(cors());
app.use(express.json());             // <---- this line must come before app.use("/groups", ...)

app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is running",
    data: null,
    error: null
  });
});

// Routes (after express.json)
app.use("/auth", require("./routes/auth"));
app.use("/groups", require("./routes/groups"));

module.exports = app;
