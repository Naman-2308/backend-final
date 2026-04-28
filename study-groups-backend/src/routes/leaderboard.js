const express = require("express");
const router = express.Router();
const { sendError } = require("../utils/apiResponse");

router.get("/", (req, res) => {
  return sendError(
    res,
    404,
    "Use GET /groups/:id/leaderboard instead",
    "LEGACY_LEADERBOARD_ROUTE"
  );
});

module.exports = router;
