const { redisClient } = require("../config/redis");

const DEFAULT_TTL_SECONDS = 300;

const getClient = () => {
  if (!redisClient || !redisClient.isReady) return null;
  return redisClient;
};

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

const set = async (key, value, ttl = DEFAULT_TTL_SECONDS) => {
  const client = getClient();
  if (!client) return;

  const safeTtl = Number.isFinite(ttl) && ttl > 0 ? Math.floor(ttl) : DEFAULT_TTL_SECONDS;

  try {
    await client.set(key, JSON.stringify(value), { EX: safeTtl });
  } catch (err) {
    console.error("Redis SET error:", err.message);
  }
};

const del = async (key) => {
  const client = getClient();
  if (!client) return;

  try {
    await client.del(key);
  } catch (err) {
    console.error("Redis DEL error:", err.message);
  }
};

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

const buildLeaderboardCacheKey = (groupId, params = {}) => {
  const parts = [
    "leaderboard",
    String(groupId),
    String(params.metric || "solved"),
    String(params.sort || "desc"),
    String(params.timeWindow || "all"),
    (params.subjects || []).join(",") || "all-subjects",
    String(params.limit ?? 10),
    String(params.offset ?? 0)
  ];

  return parts.join(":");
};

const buildProgressCacheKey = (groupId, goalId = "active") => {
  return ["progress", String(groupId), String(goalId)].join(":");
};

const getCache = get;
const setCache = set;

const invalidateGroupCache = async (groupId) => {
  await clearPattern(`leaderboard:${String(groupId)}:*`);
  await clearPattern(`progress:${String(groupId)}:*`);
};

module.exports = {
  get,
  set,
  del,
  clearPattern,
  getCache,
  setCache,
  buildLeaderboardCacheKey,
  buildProgressCacheKey,
  invalidateGroupCache
};