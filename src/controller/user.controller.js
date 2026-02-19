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

  // Check if user exists
  const existingUser = await User.findOne({ email: emailLower });

  if (existingUser) {
    // SMART LOGIC: If user exists BUT is not verified, allow re-registration (overwrite)
    if (!existingUser.isEmailVerified) {
      await User.findByIdAndDelete(existingUser._id);
    } else {
      return res.status(400).json({
        success: false,
        message: "Email already registered and verified. Please login.",
      });
    }
  }

  // Generate OTP
  const otp = EmailService.generateOTP();
  const hashedPassword = await bcrypt.hash(password, 12);

  // 1. Create User TEMPORARILY
  const user = await User.create({
    name,
    email: emailLower,
    password: hashedPassword,
    emailOTP: otp,
    emailOTPExpires: Date.now() + 10 * 60 * 1000, // 10 minutes
    isEmailVerified: false,
  });

  try {
    // 2. Try to send Email
    await EmailService.sendOTPEmail(emailLower, otp, name);

    res.status(201).json({
      success: true,
      message:
        "Registration successful. Please check your email for verification code.",
      userId: user._id,
    });
  } catch (error) {
    // 3. IF EMAIL FAILS: Delete the user so they can try again!
    await User.findByIdAndDelete(user._id);
    console.error("Registration Email Failed:", error);

    return res.status(500).json({
      success: false,
      message:
        "Failed to send verification email. Please check your email address and try again.",
    });
  }
});

// 2. VERIFY EMAIL OTP
const verifyEmailOTP = asyncHandler(async (req, res) => {
  const { userId, otp } = req.body;

  const user = await User.findById(userId).select("+emailOTP +emailOTPExpires");

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  const verification = EmailService.verifyOTP(
    user.emailOTP,
    user.emailOTPExpires,
    otp,
  );

  if (!verification.valid) {
    return res.status(400).json({
      success: false,
      message: verification.message,
    });
  }

  // Update user
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
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  if (user.isEmailVerified) {
    return res.status(400).json({
      success: false,
      message: "Email already verified",
    });
  }

  // Generate new OTP
  const otp = EmailService.generateOTP();

  user.emailOTP = otp;
  user.emailOTPExpires = Date.now() + 10 * 60 * 1000;
  await user.save();

  // Send new OTP
  await EmailService.sendOTPEmail(email, otp, user.name);

  res.json({
    success: true,
    message: "New verification code sent to your email",
  });
});

// 4. LOGIN with email verification check
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() }).select(
    "+password +loginAttempts +lockUntil +isEmailVerified +emailOTP +emailOTPExpires",
  );

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Invalid email or password",
    });
  }

  // Check if account is locked
  if (user.lockUntil && user.lockUntil > Date.now()) {
    const remainingTime = Math.ceil((user.lockUntil - Date.now()) / 60000);
    return res.status(429).json({
      success: false,
      message: `Too many failed attempts. Try again in ${remainingTime} minutes`,
    });
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    // Increment login attempts
    user.loginAttempts = (user.loginAttempts || 0) + 1;

    // Lock account after 5 failed attempts
    if (user.loginAttempts >= 5) {
      user.lockUntil = Date.now() + 30 * 60 * 1000; // Lock for 30 minutes
    }

    await user.save();

    return res.status(401).json({
      success: false,
      message: "Invalid email or password",
    });
  }

  // Check if email is verified
  if (!user.isEmailVerified) {
    // Generate and send new OTP
    const otp = EmailService.generateOTP();
    user.emailOTP = otp;
    user.emailOTPExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    await EmailService.sendOTPEmail(email, otp, user.name);

    return res.status(403).json({
      success: false,
      message:
        "Please verify your email first. A new verification code has been sent.",
      requiresVerification: true,
      userId: user._id,
    });
  }

  // Reset login attempts on successful login
  user.loginAttempts = 0;
  user.lockUntil = undefined;
  user.lastLoginAt = new Date();
  await user.save();

  const token = generateToken(user._id, user.role);

  res.json({
    success: true,
    message: "Login successful",
    token,
    user,
  });
});

// 5. REQUEST VERIFICATION (Upload ID)
const requestVerification = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "ID image is required",
    });
  }

  const user = await User.findById(req.user.userId);

  if (!user.canRequestVerification()) {
    if (user.role === "VERIFIED_SELLER") {
      return res.status(400).json({
        success: false,
        message: "You are already verified",
      });
    }
    if (user.kyc.status === "PENDING") {
      return res.status(400).json({
        success: false,
        message: "You already have a pending verification request",
      });
    }
  }

  user.kyc = {
    status: "PENDING",
    idImage: req.file.path,
    submittedAt: new Date(),
  };

  await user.save();

  res.json({
    success: true,
    message:
      "Verification request submitted successfully. Admin will review your ID.",
  });
});

// 6. ADMIN VERIFIES USER
const adminVerifyUser = asyncHandler(async (req, res) => {
  const { userId, status, rejectionReason } = req.body;

  if (!["APPROVED", "REJECTED"].includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Invalid status. Must be APPROVED or REJECTED",
    });
  }

  const user = await User.findById(userId);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  if (user.kyc.status !== "PENDING") {
    return res.status(400).json({
      success: false,
      message: "No pending verification request for this user",
    });
  }

  user.kyc.status = status;
  user.kyc.reviewedAt = new Date();
  user.kyc.reviewedBy = req.user.userId;

  if (status === "APPROVED") {
    user.role = "VERIFIED_SELLER";
  } else if (rejectionReason) {
    user.kyc.rejectionReason = rejectionReason;
  }

  await user.save();

  res.json({
    success: true,
    message:
      status === "APPROVED"
        ? "User has been verified as a seller"
        : "Verification request rejected",
  });
});

// 7. GET USER PROFILE
const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.userId);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  res.json({
    success: true,
    data: user,
  });
});

// 8. UPDATE USER PROFILE
const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone } = req.body;
  const updates = {};

  if (name) updates.name = name;
  if (phone) {
    // Check if phone is already taken
    const existingUser = await User.findOne({
      phone,
      _id: { $ne: req.user.userId },
    });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Phone number already in use",
      });
    }
    updates.phone = phone;
  }

  const user = await User.findByIdAndUpdate(req.user.userId, updates, {
    new: true,
    runValidators: true,
  });

  res.json({
    success: true,
    message: "Profile updated successfully",
    data: user,
  });
});

// 9. CHANGE PASSWORD
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user.userId).select("+password");

  const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

  if (!isPasswordValid) {
    return res.status(401).json({
      success: false,
      message: "Current password is incorrect",
    });
  }

  user.password = await bcrypt.hash(newPassword, 12);
  await user.save();

  res.json({
    success: true,
    message: "Password changed successfully",
  });
});

// 10. FORGOT PASSWORD (Request reset)
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    // Don't reveal if user exists or not for security
    return res.json({
      success: true,
      message:
        "If your email is registered, you will receive a password reset link",
    });
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString("hex");
  const resetTokenHash = await bcrypt.hash(resetToken, 10);

  user.resetPasswordToken = resetTokenHash;
  user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
  await user.save();

  // Send email with reset link (you can create a beautiful template for this too)
  console.log(
    `\n📧 PASSWORD RESET LINK: http://localhost:3000/reset-password?token=${resetToken}&userId=${user._id}\n`,
  );

  res.json({
    success: true,
    message:
      "If your email is registered, you will receive a password reset link",
  });
});

// 11. RESET PASSWORD
const resetPassword = asyncHandler(async (req, res) => {
  const { userId, token, newPassword } = req.body;

  const user = await User.findById(userId).select(
    "+resetPasswordToken +resetPasswordExpires",
  );

  if (!user || !user.resetPasswordToken || !user.resetPasswordExpires) {
    return res.status(400).json({
      success: false,
      message: "Invalid or expired reset token",
    });
  }

  if (user.resetPasswordExpires < Date.now()) {
    return res.status(400).json({
      success: false,
      message: "Reset token has expired",
    });
  }

  const isValidToken = await bcrypt.compare(token, user.resetPasswordToken);

  if (!isValidToken) {
    return res.status(400).json({
      success: false,
      message: "Invalid reset token",
    });
  }

  user.password = await bcrypt.hash(newPassword, 12);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  res.json({
    success: true,
    message:
      "Password reset successful. You can now login with your new password.",
  });
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
