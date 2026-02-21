// server/controller/user.controller.js

const User = require("../models/user.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const EmailService = require("../services/emailService");

const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// 1. REGISTER - SIMPLIFIED FOR TESTING
const createUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const emailLower = email.toLowerCase();

  // Check if user exists
  const existingUser = await User.findOne({ email: emailLower });
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: "Email already registered",
    });
  }

  // Create user directly without email verification
  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await User.create({
    name,
    email: emailLower,
    password: hashedPassword,
    isEmailVerified: true, // Auto-verified for testing
    walletBalance: 0,
    role: "USER",
  });

  const token = generateToken(user._id, user.role);

  res.status(201).json({
    success: true,
    message: "Registration successful",
    token,
    user,
  });
});

// 2. LOGIN - SIMPLIFIED
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const emailLower = email.toLowerCase();

  const user = await User.findOne({ email: emailLower }).select("+password");

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Invalid email or password",
    });
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    return res.status(401).json({
      success: false,
      message: "Invalid email or password",
    });
  }

  const token = generateToken(user._id, user.role);

  res.json({
    success: true,
    message: "Login successful",
    token,
    user,
  });
});

// 3. GET USER PROFILE
const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.userId);
  res.json({ success: true, data: user });
});

// 4. UPDATE PROFILE
const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone } = req.body;
  const updates = {};
  if (name) updates.name = name;
  if (phone) updates.phone = phone;

  const user = await User.findByIdAndUpdate(req.user.userId, updates, {
    new: true,
  });
  res.json({ success: true, message: "Profile updated", data: user });
});

// 5. FORGOT PASSWORD
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    return res.json({ success: true, message: "If email exists, code sent." });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedOTP = await bcrypt.hash(otp, 10);

  user.resetPasswordToken = hashedOTP;
  user.resetPasswordExpires = Date.now() + 10 * 60 * 1000;
  await user.save();

  console.log(`🔑 RESET OTP for ${email}: ${otp}`);

  res.json({ success: true, message: "Reset code sent" });
});

// 6. RESET PASSWORD
const resetPassword = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() }).select(
    "+resetPasswordToken +resetPasswordExpires",
  );

  if (
    !user ||
    !user.resetPasswordToken ||
    user.resetPasswordExpires < Date.now()
  ) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid or expired code" });
  }

  const isValid = await bcrypt.compare(otp, user.resetPasswordToken);
  if (!isValid) {
    return res.status(400).json({ success: false, message: "Invalid code" });
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);
  user.password = hashedPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  res.json({ success: true, message: "Password reset successful" });
});

module.exports = {
  createUser,
  loginUser,
  getUserProfile,
  updateProfile,
  forgotPassword,
  resetPassword,
};
