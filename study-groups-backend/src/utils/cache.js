const redisClient = require("../config/redis");

const CACHE_TTL_SECONDS = 60;

const buildLeaderboardCacheKey = (groupId, options = {}) => {
  const metric = options.metric || "solved";
  const sort = options.sort || "desc";
  const limit = String(options.limit ?? 10);
  const offset = String(options.offset ?? 0);
  const timeWindow = options.timeWindow || "all";
  const subjects = Array.isArray(options.subjects) ? options.subjects.join(",") : "";

  return `group:${groupId}:leaderboard:${metric}:${sort}:${timeWindow}:${subjects}:${limit}:${offset}`;
};

const buildProgressCacheKey = (groupId) => {
  return `group:${groupId}:progress`;
};

const getCache = async (key) => {
  if (!redisClient.isReady) {
    return null;
  }

  const value = await redisClient.get(key);
  return value ? JSON.parse(value) : null;
};

const setCache = async (key, value, ttlSeconds = CACHE_TTL_SECONDS) => {
  if (!redisClient.isReady) {
    return;
  }

  await redisClient.set(key, JSON.stringify(value), {
    EX: ttlSeconds
  });
};

const invalidateGroupCache = async (groupId) => {
  if (!redisClient.isReady) {
    return;
  }

  const pattern = `group:${groupId}:*`;
  const keys = [];

  for await (const keyBatch of redisClient.scanIterator({ MATCH: pattern })) {
    const batch = Array.isArray(keyBatch) ? keyBatch : [keyBatch];
    keys.push(...batch);
  }

  if (keys.length > 0) {
    await Promise.all(keys.map((key) => redisClient.del(key)));
  }
};

module.exports = {
  buildLeaderboardCacheKey,
  buildProgressCacheKey,
  getCache,
  setCache,
  invalidateGroupCache
};
