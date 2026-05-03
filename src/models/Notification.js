
const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    title: String,
    message: String,

    targetRole: {
      type: String,
      enum: ["donor", "receiver", "all"],
      default: "all",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
