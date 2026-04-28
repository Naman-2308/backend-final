const jwt = require("jsonwebtoken");

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  return process.env.JWT_SECRET;
};

const signAccessToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      email: user.email,
      name: user.name
    },
    getJwtSecret(),
    {
      expiresIn: JWT_EXPIRES_IN
    }
  );
};

const verifyAccessToken = (token) => {
  return jwt.verify(token, getJwtSecret());
};

module.exports = {
  signAccessToken,
  verifyAccessToken
};
