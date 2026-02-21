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

  if (!user)
    return res.status(404).json({ success: false, message: "User not found" });
  if (user.isEmailVerified)
    return res.status(400).json({ success: false, message: "Email verified" });

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

  // Explicitly select password to compare
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

// 5. REQUEST VERIFICATION
const requestVerification = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "ID image required" });

  const user = await User.findById(req.user.userId);
  user.kyc = {
    status: "PENDING",
    idImage: req.file.path,
    submittedAt: new Date(),
  };
  await user.save();

  res.json({ success: true, message: "Verification request submitted" });
});

// 6. ADMIN VERIFY
const adminVerifyUser = asyncHandler(async (req, res) => {
  const { userId, status } = req.body;
  const user = await User.findById(userId);

  if (!user) return res.status(404).json({ message: "User not found" });

  user.kyc.status = status;
  if (status === "APPROVED") user.role = "VERIFIED_SELLER";

  await user.save();
  res.json({ success: true, message: `User status: ${status}` });
});

// 7. GET PROFILE
const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.userId);
  res.json({ success: true, data: user });
});

// 8. UPDATE PROFILE
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

// 9. CHANGE PASSWORD (FIXED - DIRECT WRITE)
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.userId;

  console.log(`🔐 Attempting password change for User ID: ${userId}`);

  // 1. Get user with password explicitly
  const user = await User.findById(userId).select("+password");

  if (!user) {
    console.log("❌ User not found");
    return res.status(404).json({ success: false, message: "User not found" });
  }

  // 2. Verify Old Password
  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    console.log("❌ Incorrect current password");
    return res
      .status(401)
      .json({ success: false, message: "Current password is incorrect" });
  }

  // 3. Hash New Password
  // Important: 12 rounds is standard
  const hashedPassword = await bcrypt.hash(newPassword, 12);

  // 4. FORCE UPDATE using updateOne
  // This bypasses Mongoose validation/hooks and talks directly to MongoDB driver
  const result = await User.updateOne(
    { _id: userId },
    { $set: { password: hashedPassword } },
  );

  console.log("✅ MongoDB Update Result:", result);

  if (result.modifiedCount === 0) {
    console.log("⚠️ Password matched but DB did not report a modification.");
    // This happens if new password is same as old (hashed), but we still return success
  }

  res.json({
    success: true,
    message: "Password changed successfully",
  });
});

// 10. FORGOT PASSWORD
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user)
    return res.json({
      success: true,
      message: "If registered, reset link sent.",
    });

  const resetToken = crypto.randomBytes(32).toString("hex");
  const resetTokenHash = await bcrypt.hash(resetToken, 10);

  user.resetPasswordToken = resetTokenHash;
  user.resetPasswordExpires = Date.now() + 60 * 60 * 1000;
  await user.save();

  console.log(
    `\n🔑 RESET LINK: http://localhost:3000/reset-password?token=${resetToken}&userId=${user._id}\n`,
  );

  res.json({ success: true, message: "Reset link sent (Check logs)" });
});

// 11. RESET PASSWORD
const resetPassword = asyncHandler(async (req, res) => {
  const { userId, token, newPassword } = req.body;
  const user = await User.findById(userId).select(
    "+resetPasswordToken +resetPasswordExpires",
  );

  if (
    !user ||
    !user.resetPasswordToken ||
    user.resetPasswordExpires < Date.now()
  ) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid/Expired token" });
  }

  const isValidToken = await bcrypt.compare(token, user.resetPasswordToken);
  if (!isValidToken)
    return res.status(400).json({ success: false, message: "Invalid token" });

  const hashedPassword = await bcrypt.hash(newPassword, 12);

  // Use updateOne here too for safety
  await User.updateOne(
    { _id: userId },
    {
      $set: { password: hashedPassword },
      $unset: { resetPasswordToken: 1, resetPasswordExpires: 1 }, // Remove fields
    },
  );

  res.json({ success: true, message: "Password reset successful" });
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
