const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();

/* =========================
   GLOBAL MIDDLEWARE
========================= */

// Enable CORS (safe default for APIs)
app.use(cors());

// Parse JSON requests
app.use(express.json());

/* =========================
   BASIC ROUTES
========================= */

/**
 * Root route (fixes "Cannot GET /" issue)
 * Safe, does not interfere with APIs
 */
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Study Groups Backend is running 🚀",
    version: "1.0.0",
    docs: "/health",
    routes: {
      auth: "/auth",
      groups: "/groups",
      health: "/health",
    },
  });
});

/**
 * Health check route (for deployment monitoring)
 */
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

/* =========================
   API ROUTES
========================= */

// Auth routes
app.use("/auth", require("./routes/auth"));

// Group routes
app.use("/groups", require("./routes/groups"));

/* =========================
   404 HANDLER (IMPORTANT)
========================= */

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

module.exports = app;