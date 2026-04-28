const User = require("../models/User");
const { signAccessToken } = require("../utils/jwt");
const { sendError, sendSuccess } = require("../utils/apiResponse");

// Mock Google OAuth entry point for assignment/demo purposes.
// In production, the Google token would be verified server-side first.
const googleLogin = async (req, res) => {
  try {
    const { googleId, email, name, avatar } = req.body;

    if (!email || !name) {
      return sendError(
        res,
        400,
        "Email and name are required",
        "VALIDATION_ERROR",
        {
          requiredFields: ["email", "name"]
        }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    let user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      user = await User.create({
        googleId: googleId || normalizedEmail,
        email: normalizedEmail,
        name: name.trim(),
        ...(avatar ? { avatar } : {})
      });
    } else {
      user.googleId = googleId || user.googleId || normalizedEmail;
      user.name = name.trim();
      user.avatar = avatar || user.avatar;
      await user.save();
    }

    const accessToken = signAccessToken(user);

    return sendSuccess(res, 200, "Authentication successful", {
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        avatar: user.avatar
      },
      token: accessToken
    });
  } catch (error) {
    return sendError(
      res,
      500,
      "Authentication failed",
      "AUTHENTICATION_ERROR",
      error.message
    );
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select(
      "_id email name avatar createdAt updatedAt"
    );

    if (!user) {
      return sendError(res, 404, "User not found", "USER_NOT_FOUND");
    }

    return sendSuccess(res, 200, "Authenticated user fetched successfully", {
      user
    });
  } catch (error) {
    return sendError(
      res,
      500,
      "Failed to fetch authenticated user",
      "AUTH_USER_FETCH_ERROR",
      error.message
    );
  }
};

module.exports = {
  googleLogin,
  getMe
};
