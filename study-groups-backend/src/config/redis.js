const redis = require("redis");

const REDIS_URL = process.env.REDIS_URL;

const redisClient = redis.createClient({
  url: REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 5) return new Error("Redis retry limit reached");
      return Math.min(retries * 200, 3000);
    },
  },
});

let isConnecting = false;

redisClient.on("error", (err) => {
  console.error("Redis Error:", err.message);
});

redisClient.on("connect", () => {
  console.log("Redis connection established");
});

redisClient.on("ready", () => {
  console.log("Redis ready to use");
});

const connectRedis = async () => {
  if (!REDIS_URL) {
    console.warn("⚠️ REDIS_URL missing. Redis disabled.");
    return null;
  }

  if (redisClient.isReady || isConnecting) {
    return redisClient;
  }

  try {
    isConnecting = true;
    await redisClient.connect();
    return redisClient;
  } catch (err) {
    console.error("Redis connection failed:", err.message);
    return null;
  } finally {
    isConnecting = false;
  }
};

module.exports = {
  redisClient,
  connectRedis,
};