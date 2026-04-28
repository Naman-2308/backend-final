const User = require("../models/User");
const { signAccessToken } = require("../utils/jwt");
const { sendError, sendSuccess } = require("../utils/apiResponse");
const { OAuth2Client } = require("google-auth-library");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const googleLogin = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return sendError(
        res,
        400,
        "Google idToken is required",
        "ID_TOKEN_REQUIRED"
      );
    }

    // ✅ Verify token with Google
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();

    const {
      sub: googleId,
      email,
      name,
      picture: avatar
    } = payload;

    if (!email || !name) {
      return sendError(
        res,
        400,
        "Invalid Google token payload",
        "INVALID_GOOGLE_TOKEN"
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    let user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      user = await User.create({
        googleId,
        email: normalizedEmail,
        name: name.trim(),
        avatar
      });
    } else {
      user.googleId = googleId;
      user.name = name.trim();
      user.avatar = avatar;
      await user.save();
    }

    const accessToken = signAccessToken({
      userId: user._id,
      email: user.email
    });

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
      401,
      "Google authentication failed",
      "GOOGLE_AUTH_FAILED",
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