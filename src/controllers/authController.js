const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

let otpStore = {};

// 📩 Email setup
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ================= SEND OTP =================
exports.sendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).send("Email required");
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).send("User not found");
    }

    const otp = Math.floor(100000 + Math.random() * 900000);

    otpStore[email] = {
      otp,
      expires: Date.now() + 5 * 60 * 1000, // 5 min
    };

    await transporter.sendMail({
      from: "freefoodconnect@gmail.com",
      to: email,
      subject: "Reset Password OTP",
      text: `Your OTP is ${otp}`,
    });

    console.log("OTP:", otp);

    res.send("OTP sent to email");
  } catch (err) {
    console.log(err);
    res.status(500).send("Server error");
  }
};

// ================= RESET PASSWORD =================
exports.resetPassword = async (req, res) => {
  try {
    const { otp, password } = req.body;

    let validEmail = null;

    // 🔍 find email by OTP
    for (let email in otpStore) {
      const data = otpStore[email];

      if (String(data.otp) === String(otp) && data.expires > Date.now()) {
        validEmail = email;
        break;
      }
    }

    if (!validEmail) {
      return res.status(400).send("Invalid or expired OTP");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await User.findOneAndUpdate(
      { email: validEmail },
      { password: hashedPassword },
    );

    delete otpStore[validEmail];

    res.send("Password updated successfully");
  } catch (err) {
    console.log(err);
    res.status(500).send("Server error");
  }
};

// ================== SIGNUP ==================
exports.signup = async (req, res) => {
  try {
    const { name, email, password, location, role } = req.body;

    if (!name || !email || !password || !location) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      location,
      role,
    });

    res.status(201).json({
      message: "Signup successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        location: user.location,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ================== LOGIN ==================
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // 🔥 THIS WAS THE MISSING PART
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        location: user.location,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
