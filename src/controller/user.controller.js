// src/controller/user.controller.js
const User = require("../models/user.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const EmailService = require("../services/emailService");

// Utility function to generate JWT
const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// 1. REGISTER
const createUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const emailLower = email.toLowerCase();

  const existingUser = await User.findOne({ email: emailLower });
  if (existingUser) {
    if (!existingUser.isEmailVerified) {
      await User.findByIdAndDelete(existingUser._id);
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Email already registered" });
    }
  }

  const otp = EmailService.generateOTP();
  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await User.create({
    name,
    email: emailLower,
    password: hashedPassword,
    emailOTP: otp,
    emailOTPExpires: Date.now() + 10 * 60 * 1000,
    isEmailVerified: false,
  });

  try {
    // TRY REAL EMAIL
    await EmailService.sendOTPEmail(emailLower, otp, name);

    res.status(201).json({
      success: true,
      message: "Verification code sent to your email.",
      userId: user._id,
    });
  } catch (error) {
    // FALLBACK IF RAILWAY FAILS (So you can still test)
    console.log("⚠️ EMAIL FAILED (Check Railway Logs for OTP)");
    console.log(`🔑 OTP FOR ${emailLower}: ${otp}`);

    res.status(201).json({
      success: true,
      message: "Email failed, but OTP logged in server console.",
      userId: user._id,
    });
  }
});

// 2. VERIFY OTP
const verifyEmailOTP = asyncHandler(async (req, res) => {
  const { userId, otp } = req.body;
  const user = await User.findById(userId).select("+emailOTP +emailOTPExpires");

  if (!user)
    return res.status(404).json({ success: false, message: "User not found" });

  const verification = EmailService.verifyOTP(
    user.emailOTP,
    user.emailOTPExpires,
    otp,
  );
  if (!verification.valid)
    return res
      .status(400)
      .json({ success: false, message: verification.message });

  user.isEmailVerified = true;
  user.emailOTP = undefined;
  user.emailOTPExpires = undefined;
  await user.save();

  const token = generateToken(user._id, user.role);
  res.json({ success: true, message: "Verified!", token, user });
});

// 3. LOGIN
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() }).select(
    "+password +isEmailVerified +emailOTP +emailOTPExpires",
  );

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res
      .status(401)
      .json({ success: false, message: "Invalid credentials" });
  }

  if (!user.isEmailVerified) {
    const otp = EmailService.generateOTP();
    user.emailOTP = otp;
    user.emailOTPExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    // Try sending email again
    try {
      await EmailService.sendOTPEmail(email, otp, user.name);
    } catch (e) {
      console.log(`🔑 LOGIN OTP: ${otp}`);
    }

    return res.status(403).json({
      success: false,
      message: "Please verify email first.",
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
  if (!user)
    return res.status(404).json({ success: false, message: "User not found" });

  const otp = EmailService.generateOTP();
  user.emailOTP = otp;
  user.emailOTPExpires = Date.now() + 10 * 60 * 1000;
  await user.save();

  try {
    await EmailService.sendOTPEmail(email, otp, user.name);
    res.json({ success: true, message: "New OTP sent!" });
  } catch (e) {
    console.log(`🔑 RESEND OTP: ${otp}`);
    res.json({ success: true, message: "OTP logged in console" });
  }
});

module.exports = {
  createUser,
  verifyEmailOTP,
  resendOTP,
  loginUser,
  requestVerification,
  adminVerifyUser,
  getUserProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
};
