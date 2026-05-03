const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {
  sendNotification,
  getNotifications,
} = require("../controllers/notificationController");

/* Admin send */
router.post("/send", authMiddleware, sendNotification);

/* User fetch */
router.get("/all", authMiddleware, getNotifications);

module.exports = router;
