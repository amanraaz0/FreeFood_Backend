const express = require("express");
const { signup, login } = require("../controllers/authController");

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);

const {
  sendOTP,
  resetPassword,
} = require("../controllers/authController");

// 🔥 Send OTP
router.post("/send-otp", sendOTP);

// 🔥 Reset Password
router.post("/reset-password", resetPassword);


module.exports = router;
