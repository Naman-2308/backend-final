const express = require("express");
const authController = require("../controllers/authController");
const authMiddleware = require("../middlewares/auth");

const router = express.Router();

router.post("/google", authController.googleLogin);
router.get("/me", authMiddleware, authController.getMe);

module.exports = router;
