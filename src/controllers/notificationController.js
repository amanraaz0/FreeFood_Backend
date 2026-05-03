const Notification = require("../models/Notification");

/**
 * ADMIN SEND NOTIFICATION
 */
exports.sendNotification = async (req, res) => {
  try {
    const { title, message, targetRole } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        message: "Title and message required",
      });
    }

    const notification = await Notification.create({
      title,
      message,
      targetRole,
    });

    res.json({
      message: "Notification sent ✅",
      notification,
    });
  } catch {
    res.status(500).json({ message: "Failed to send notification" });
  }
};

/**
 * GET USER NOTIFICATIONS
 */
exports.getNotifications = async (req, res) => {
  try {
    const userRole = req.user.role;

    const notifications = await Notification.find({
      targetRole: { $in: [userRole, "all"] },
    }).sort({ createdAt: -1 });

    res.json(notifications);
  } catch {
    res.status(500).json({ message: "Failed to load notifications" });
  }
};
