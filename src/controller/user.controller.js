// src/controller/user.controller.js

const User = require("../models/user.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Utility function to generate JWT
const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

// Utility function to handle async errors
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// 1. REGISTER (Manual OTP Mode)
const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;
  const emailLower = email.toLowerCase();

  // Check if user exists
  const existingUser = await User.findOne({ email: emailLower });
  
  if (existingUser) {
    // If user exists but is NOT verified, delete them so we can try again
    if (!existingUser.isEmailVerified) {
      await User.findByIdAndDelete(existingUser._id);
    } else {
      return res.status(400).json({
        success: false,
        message: "Email already registered. Please login.",
      });
    }
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedPassword = await bcrypt.hash(password, 12);

  // Create User with OTP
  const user = await User.create({
    name,
    email: emailLower,
    password: hashedPassword,
    phone: phone,
    emailOTP: otp,
    emailOTPExpires: Date.now() + 60 * 60 * 1000, // 1 hour validity
    isEmailVerified: false,
  });

  // 🛑 LOG OTP TO CONSOLE (Bypass Email)
  console.log("========================================");
  console.log(`🔐 MANUAL OTP for ${emailLower}: ${otp}`);
  console.log("========================================");

  res.status(201).json({
    success: true,
    message: "User created. Check Server Logs for OTP.",
    userId: user._id, 
    requiresVerification: true
  });
});

// 2. VERIFY EMAIL OTP
const verifyEmailOTP = asyncHandler(async (req, res) => {
  const { userId, otp } = req.body;

  // Find user and select hidden OTP fields
  const user = await User.findById(userId).select("+emailOTP +emailOTPExpires");

  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  // Verify OTP matches DB
  if (!user.emailOTP || user.emailOTP !== otp) {
    return res.status(400).json({ success: false, message: "Invalid verification code" });
  }

  if (Date.now() > user.emailOTPExpires) {
    return res.status(400).json({ success: false, message: "Code has expired" });
  }

  // Mark Verified
  user.isEmailVerified = true;
  user.emailOTP = undefined;
  user.emailOTPExpires = undefined;
  user.lastLoginAt = new Date();
  await user.save();

  // Generate Token (Auto Login)
  const token = generateToken(user._id, user.role);

  res.json({
    success: true,
    message: "Email verified successfully",
    token,
    user,
  });
});

// 3. LOGIN
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  
  const user = await User.findOne({ email: email.toLowerCase() })
    .select("+password +isEmailVerified +emailOTP +emailOTPExpires");

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ success: false, message: "Invalid email or password" });
  }

  // If not verified, generate new OTP and force verification
  if (!user.isEmailVerified) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.emailOTP = otp;
    user.emailOTPExpires = Date.now() + 60 * 60 * 1000;
    await user.save();

    console.log(`🔐 LOGIN MANUAL OTP for ${email}: ${otp}`);

    return res.status(403).json({
      success: false,
      message: "Please verify your email first.",
      requiresVerification: true,
      userId: user._id,
    });
  }

  const token = generateToken(user._id, user.role);
  res.json({ success: true, message: "Login successful", token, user });
});

// 4. RESEND OTP
const resendOTP = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) return res.status(404).json({ success: false, message: "User not found" });
  if (user.isEmailVerified) return res.status(400).json({ success: false, message: "Email already verified" });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  user.emailOTP = otp;
  user.emailOTPExpires = Date.now() + 60 * 60 * 1000;
  await user.save();

  console.log(`♻️ RESEND MANUAL OTP for ${email}: ${otp}`);

  res.json({ success: true, message: "New OTP generated (Check Logs)" });
});

module.exports = {
  createUser,
  loginUser,
  getUserProfile,
  updateProfile,
  forgotPassword,
  resetPassword,
  changePassword,
};
