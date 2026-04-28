const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = require("./app");
const connectDB = require("./config/db");
const { connectRedis } = require("./config/redis");
const { archiveExpiredGoals } = require("./utils/goalLifecycle");

const PORT = process.env.PORT || 5000;

let server;

const startServer = async () => {
  try {
    // =========================
    // 1. DATABASE CONNECTION
    // =========================
    await connectDB();
    console.log("MongoDB connected");

    // =========================
    // 2. REDIS CONNECTION (SAFE)
    // =========================
    const redisClient = await connectRedis();

if (redisClient?.isReady) {
  console.log("Redis enabled");
} else {
  console.log("Redis disabled (fallback mode)");
}

    // =========================
    // 3. START SERVER
    // =========================
    server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    // =========================
    // 4. BACKGROUND JOBS
    // =========================
    setInterval(async () => {
      try {
        await archiveExpiredGoals();
        console.log("Checked for expired goals...");
      } catch (err) {
        console.error("Goal archive job failed:", err.message);
      }
    }, 60 * 1000);

  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
};

// =========================
// GRACEFUL SHUTDOWN
// =========================
const shutdown = async (signal) => {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);

  try {
    if (server) {
      server.close(() => {
        console.log("HTTP server closed");
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error("Error during shutdown:", err.message);
    process.exit(1);
  }
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// =========================
// START APPLICATION
// =========================
startServer();