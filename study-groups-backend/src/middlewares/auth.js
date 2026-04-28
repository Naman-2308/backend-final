const { verifyAccessToken } = require("../utils/jwt");
const { sendError } = require("../utils/apiResponse");

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return sendError(
        res,
        401,
        "Authorization token missing or malformed",
        "AUTH_TOKEN_MISSING"
      );
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyAccessToken(token);

    req.user = decoded;
    next();
  } catch (error) {
    return sendError(
      res,
      401,
      "Invalid or expired token",
      "AUTH_TOKEN_INVALID",
      error.message
    );
  }
};

module.exports = authMiddleware;
