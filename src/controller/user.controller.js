// server/controller/user.controller.js

const User = require("../models/user.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const EmailService = require("../services/emailService");

// Utility function to generate JWT
const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

// Utility function to handle async errors
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// 1. REGISTER
const createUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const emailLower = email.toLowerCase();

  const existingUser = await User.findOne({ email: emailLower });
  if (existingUser) {
    if (!existingUser.isEmailVerified) {
      await User.findByIdAndDelete(existingUser._id);
    } else {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
      });
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
    await EmailService.sendOTPEmail(emailLower, otp, name);
    res.status(201).json({
      success: true,
      message: "Verification code sent to your email.",
      userId: user._id,
    });
  } catch (error) {
    console.log(`🔑 DEV MODE OTP for ${emailLower}: ${otp}`);
    res.status(201).json({
      success: true,
      message: "Dev Mode: Email failed. Check Server Logs for OTP.",
      userId: user._id,
    });
  }
});

// 2. VERIFY EMAIL OTP
const verifyEmailOTP = asyncHandler(async (req, res) => {
  const { userId, otp } = req.body;
  const user = await User.findById(userId).select("+emailOTP +emailOTPExpires");

  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  const verification = EmailService.verifyOTP(
    user.emailOTP,
    user.emailOTPExpires,
    otp,
  );

  if (!verification.valid) {
    return res
      .status(400)
      .json({ success: false, message: verification.message });
  }

  user.isEmailVerified = true;
  user.emailOTP = undefined;
  user.emailOTPExpires = undefined;
  user.lastLoginAt = new Date();
  await user.save();

  const token = generateToken(user._id, user.role);

  res.json({
    success: true,
    message: "Email verified successfully",
    token,
    user,
  });
});

// 3. RESEND OTP
const resendOTP = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }
  if (user.isEmailVerified) {
    return res.status(400).json({ success: false, message: "Email verified" });
  }

  const otp = EmailService.generateOTP();
  user.emailOTP = otp;
  user.emailOTPExpires = Date.now() + 10 * 60 * 1000;
  await user.save();

  try {
    await EmailService.sendOTPEmail(email, otp, user.name);
    res.json({ success: true, message: "New code sent!" });
  } catch (error) {
    console.log(`♻️ RESEND DEV OTP for ${email}: ${otp}`);
    res.json({ success: true, message: "Dev Mode: Check logs for OTP" });
  }
});

// 4. LOGIN
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() }).select(
    "+password +isEmailVerified",
  );

  if (!user) {
    return res
      .status(401)
      .json({ success: false, message: "Invalid credentials" });
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    return res
      .status(401)
      .json({ success: false, message: "Invalid credentials" });
  }

  if (!user.isEmailVerified) {
    return res.status(403).json({
      success: false,
      message: "Please verify your email first.",
      requiresVerification: true,
      userId: user._id,
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

// 5. FORGOT PASSWORD - Send OTP
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const emailLower = email.toLowerCase();

  console.log(`🔐 Forgot password requested for: ${emailLower}`);

  const user = await User.findOne({ email: emailLower });

  // Always return success to prevent email enumeration
  if (!user) {
    console.log(`❌ User not found: ${emailLower}`);
    return res.json({
      success: true,
      message: "If your email is registered, you will receive a reset code.",
    });
  }

  // Generate 6-digit OTP
  const otp = EmailService.generateOTP();
  const hashedOTP = await bcrypt.hash(otp, 10);

  // Store hashed OTP in database
  user.resetPasswordToken = hashedOTP;
  user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  await user.save();

  console.log(`✅ Reset OTP generated for ${emailLower}: ${otp}`);

  try {
    // Send OTP via email
    await EmailService.sendPasswordResetEmail(emailLower, otp, user.name);
    console.log(`✅ Reset email sent to: ${emailLower}`);

    res.json({
      success: true,
      message: "Reset code sent to your email.",
    });
  } catch (error) {
    console.error(`❌ Failed to send reset email to: ${emailLower}`, error);

    // For development, return OTP in response
    if (process.env.NODE_ENV === "development") {
      return res.json({
        success: true,
        message: "Dev Mode: Check logs for OTP",
        dev_otp: otp, // Only in development!
      });
    }

    res.json({
      success: true,
      message: "Reset code sent to your email.",
    });
  }
});

// 6. RESET PASSWORD - Verify OTP and set new password
const resetPassword = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;
  const emailLower = email.toLowerCase();

  console.log(`🔐 Reset password attempt for: ${emailLower}`);

  // Find user with reset token fields
  const user = await User.findOne({ email: emailLower }).select(
    "+resetPasswordToken +resetPasswordExpires",
  );

  if (!user) {
    return res.status(400).json({
      success: false,
      message: "Invalid or expired reset code.",
    });
  }

  // Check if reset token exists and is not expired
  if (
    !user.resetPasswordToken ||
    !user.resetPasswordExpires ||
    user.resetPasswordExpires < Date.now()
  ) {
    return res.status(400).json({
      success: false,
      message: "Reset code has expired. Please request a new one.",
    });
  }

  // Verify OTP
  const isValidOTP = await bcrypt.compare(otp, user.resetPasswordToken);

  if (!isValidOTP) {
    console.log(`❌ Invalid OTP for ${emailLower}`);
    return res.status(400).json({
      success: false,
      message: "Invalid reset code.",
    });
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 12);

  // Update user password and clear reset fields
  user.password = hashedPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  console.log(`✅ Password reset successful for: ${emailLower}`);

  res.json({
    success: true,
    message:
      "Password reset successful. You can now login with your new password.",
  });
});

// 7. CHANGE PASSWORD (Authenticated)
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.userId;

  console.log(`🔐 Password change attempt for User ID: ${userId}`);

  const user = await User.findById(userId).select("+password");

  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    return res
      .status(401)
      .json({ success: false, message: "Current password is incorrect" });
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);

  user.password = hashedPassword;
  await user.save();

  console.log(`✅ Password changed successfully for User ID: ${userId}`);

  res.json({
    success: true,
    message: "Password changed successfully",
  });
});

// 8. REQUEST VERIFICATION
const requestVerification = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "ID image required" });
  }

  const user = await User.findById(req.user.userId);
  user.kyc = {
    status: "PENDING",
    idImage: req.file.path,
    submittedAt: new Date(),
  };
  await user.save();

  res.json({ success: true, message: "Verification request submitted" });
});

// 9. ADMIN VERIFY
const adminVerifyUser = asyncHandler(async (req, res) => {
  const { userId, status } = req.body;
  const user = await User.findById(userId);

  if (!user) return res.status(404).json({ message: "User not found" });

  user.kyc.status = status;
  if (status === "APPROVED") user.role = "VERIFIED_SELLER";

  await user.save();
  res.json({ success: true, message: `User status: ${status}` });
});

// 10. GET PROFILE
const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.userId);
  res.json({ success: true, data: user });
});

// 11. UPDATE PROFILE
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

module.exports = {
  createUser,
  verifyEmailOTP,
  resendOTP,
  loginUser,
  forgotPassword,
  resetPassword,
  changePassword,
  requestVerification,
  adminVerifyUser,
  getUserProfile,
  updateProfile,
};
