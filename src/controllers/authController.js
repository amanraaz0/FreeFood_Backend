const dns = require("dns");

dns.setDefaultResultOrder("ipv4first");

const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const axios = require("axios");

let otpStore = {};

// 📩 Email setup

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
    await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: {
          name: "FreeFood",
          email: "freefoodconnect@gmail.com",
        },

        to: [
          {
            email: email,
          },
        ],

        subject: "FreeFood Password Reset OTP",

        htmlContent: `
<div style="font-family: Arial, sans-serif; background:#f4f4f4; padding:40px;">
  <div style="max-width:500px; margin:auto; background:white; border-radius:10px; padding:30px; text-align:center; box-shadow:0 0 10px rgba(0,0,0,0.1);">

    <h1 style="color:#22c55e;">FreeFood</h1>

    <h2 style="color:#333;">Password Reset OTP</h2>

    <p style="font-size:16px; color:#555;">
      Use the OTP below to reset your password.
    </p>

    <div style="margin:30px 0;">
      <span style="
        display:inline-block;
        background:#22c55e;
        color:white;
        font-size:32px;
        letter-spacing:5px;
        padding:15px 30px;
        border-radius:8px;
        font-weight:bold;
      ">
        ${otp}
      </span>
    </div>

    <p style="color:#777; font-size:14px;">
      This OTP is valid for 5 minutes.
    </p>

    <hr style="margin:30px 0;" />

    <p style="font-size:13px; color:#999;">
      If you did not request this, please ignore this email.
    </p>

  </div>
</div>
`,
      },
      {
        headers: {
          accept: "application/json",
          "api-key": process.env.BREVO_API_KEY,
          "content-type": "application/json",
        },
      },
    );

    console.log("OTP:", otp);

    res.send("OTP sent to email");
  } catch (err) {
    console.log("BREVO ERROR:", err.response?.data || err);

    res.status(500).json({
      message: err.message,
      data: err.response?.data,
    });
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
