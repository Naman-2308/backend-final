const redis = require("redis");

const redisClient = redis.createClient({
  socket: {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: Number(process.env.REDIS_PORT || 6379)
  }
});

let isConnecting = false;

redisClient.on("error", (err) => {
  console.error("Redis Error:", err.message);
});

redisClient.on("connect", () => {
  console.log("Redis Connected");
});

const connectRedis = async () => {
  if (redisClient.isReady || isConnecting) {
    return redisClient;
  }

  try {
    isConnecting = true;
    await redisClient.connect();
  } catch (error) {
    console.error("Redis connection unavailable:", error.message);
  } finally {
    isConnecting = false;
  }

  return redisClient;
};

module.exports = redisClient;
module.exports.connectRedis = connectRedis;
