const express = require("express");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./routes/authRoutes");
const foodRoutes = require("./routes/foodRoutes");

const app = express();

app.use(cors());
app.use(express.json()); // 👈 THIS IS MANDATORY

app.use("/api/auth", authRoutes);
app.use("/api/food", foodRoutes);
const protectedRoutes = require("./routes/protectedRoutes");

app.use("/api/protected", protectedRoutes);
const notificationRoutes = require("./routes/notificationRoutes");

app.use("/api/notifications", notificationRoutes);



app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (req, res) => {
  res.send("FreeFood Backend API Running");
});

module.exports = app;
