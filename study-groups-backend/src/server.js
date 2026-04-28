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
    // 1. Connect DB
    await connectDB();
    console.log("MongoDB connected");

    // 2. Connect Redis 
    try {
      await connectRedis();
      console.log("Redis connected");
    } catch (err) {
      console.warn("Redis not available, continuing without cache");
    }

    // 3. Start server
    server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    // 4. Start background job ONLY after server is ready
    setInterval(async () => {
      try {
        await archiveExpiredGoals();
        console.log("Checked for expired goals...");
      } catch (err) {
        console.error("Goal archive job failed:", err.message);
      }
    }, 60 * 1000);

  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
};

// Graceful shutdown (VERY important for production readiness)
const shutdown = async (signal) => {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);

  if (server) {
    server.close(() => {
      console.log("HTTP server closed");
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

startServer();