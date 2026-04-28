const jwt = require("jsonwebtoken");

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }
  return process.env.JWT_SECRET;
};

const signAccessToken = (payload) => {
  if (!payload) {
    throw new Error("Payload is required for token signing");
  }

  const userId = payload.userId || payload._id;

  if (!userId) {
    throw new Error("userId is required in token payload");
  }

  return jwt.sign(
    {
      userId: String(userId),
      email: payload.email,
      name: payload.name
    },
    getJwtSecret(),
    {
      expiresIn: JWT_EXPIRES_IN,
      issuer: "study-groups-app",
      audience: "study-groups-users"
    }
  );
};

const verifyAccessToken = (token) => {
  return jwt.verify(token, getJwtSecret(), {
    issuer: "study-groups-app",
    audience: "study-groups-users"
  });
};

module.exports = {
  signAccessToken,
  verifyAccessToken
};