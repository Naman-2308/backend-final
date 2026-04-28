const { redisClient } = require("../config/redis");

const getClient = () => {
  if (!redisClient || !redisClient.isReady) return null;
  return redisClient;
};

// -------------------- GET --------------------
const get = async (key) => {
  const client = getClient();
  if (!client) return null;

  try {
    const value = await client.get(key);
    return value ? JSON.parse(value) : null;
  } catch (err) {
    console.error("Redis GET error:", err.message);
    return null;
  }
};

// -------------------- SET --------------------
const set = async (key, value, ttl = 3600) => {
  const client = getClient();
  if (!client) return;

  try {
    await client.set(key, JSON.stringify(value), {
      EX: ttl,
    });
  } catch (err) {
    console.error("Redis SET error:", err.message);
  }
};

// -------------------- DELETE --------------------
const del = async (key) => {
  const client = getClient();
  if (!client) return;

  try {
    await client.del(key);
  } catch (err) {
    console.error("Redis DEL error:", err.message);
  }
};

// -------------------- CLEAR PATTERN --------------------
const clearPattern = async (pattern) => {
  const client = getClient();
  if (!client) return;

  try {
    for await (const key of client.scanIterator({ MATCH: pattern })) {
      await client.del(key);
    }
  } catch (err) {
    console.error("Redis CLEAR error:", err.message);
  }
};

module.exports = {
  get,
  set,
  del,
  clearPattern,
};