const User = require("../models/user.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const EmailService = require("../services/emailService");
// Import Firebase Admin for Google Auth
const admin = require("../config/firebase");

const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// 1. REGISTER
const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const emailLower = email.toLowerCase();

  const existing = await User.findOne({ email: emailLower });
  if (existing) {
    return res
      .status(400)
      .json({ success: false, message: "Email already registered" });
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
    role: "USER", // Add default role explicitly
  });

  console.log(`🔑 OTP for ${emailLower}: ${otp}`);

  try {
    await EmailService.sendOTPEmail(emailLower, otp, name);
    console.log(`📧 Verification email sent to ${emailLower}`);
  } catch (emailError) {
    console.error(`❌ Failed to send email: ${emailError.message}`);
  }

  res.status(201).json({
    success: true,
    message: "Registration successful. Check your email for OTP.",
    userId: user._id,
  });
});

// 2. VERIFY EMAIL (Updated to return Token)
const verifyEmail = asyncHandler(async (req, res) => {
  const { userId, otp } = req.body;

  const user = await User.findById(userId).select("+emailOTP +emailOTPExpires");
  if (!user)
    return res.status(404).json({ success: false, message: "User not found" });

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

  // Mark verified and clear OTP
  user.isEmailVerified = true;
  user.emailOTP = undefined;
  user.emailOTPExpires = undefined;
  await user.save();

  // Generate Token immediately for auto-login
  const token = generateToken(user._id, user.role);

  res.json({
    success: true,
    message: "Email verified successfully",
    token,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      walletBalance: user.walletBalance,
    },
  });
});

// 3. GOOGLE LOGIN (Fixed - Role now "USER" not "user")
const googleLogin = asyncHandler(async (req, res) => {
  const { idToken } = req.body;

  try {
    // A. Verify Google Token with Firebase Admin SDK
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { email, name, picture, uid } = decodedToken;

    // B. Check if user exists in MongoDB
    let user = await User.findOne({ email });

    if (user) {
      // User exists -> Update last login
      user.lastLoginAt = new Date();
      await user.save();
    } else {
      // User does NOT exist -> Register automatically
      console.log(`🆕 Creating new Google user: ${email}`);

      // Generate a random strong password (since they use Google login)
      const randomPassword =
        Math.random().toString(36).slice(-8) +
        Math.random().toString(36).slice(-8);
      const hashedPassword = await bcrypt.hash(randomPassword, 12);

      // ✅ FIXED: Changed "user" to "USER" (uppercase to match enum)
      user = await User.create({
        name: name || "Google User",
        email: email,
        password: hashedPassword,
        isEmailVerified: true, // Trusted provider, so email is verified
        role: "USER", // ← CHANGED from "user" to "USER"
        // Optional: save googleId or pictureUrl if your schema supports it
      });
    }

    // C. Generate JWT Token
    const token = generateToken(user._id, user.role);

    // D. Return Success Response
    res.json({
      success: true,
      message: "Google login successful",
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        walletBalance: user.walletBalance,
      },
    });
  } catch (error) {
    console.error("❌ Google Auth Error:", error.message);
    res
      .status(401)
      .json({ success: false, message: "Invalid Google ID Token" });
  }
});

// 4. RESEND OTP
const resendOTP = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const emailLower = email.toLowerCase();

  const user = await User.findOne({ email: emailLower });
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

  const otp = EmailService.generateOTP();
  user.emailOTP = otp;
  user.emailOTPExpires = Date.now() + 10 * 60 * 1000;
  await user.save();

  console.log(`🔑 New OTP for ${emailLower}: ${otp}`);

  try {
    await EmailService.sendOTPEmail(emailLower, otp, user.name);
    console.log(`📧 Verification email resent to ${emailLower}`);
  } catch (emailError) {
    console.error(`❌ Failed to send email: ${emailError.message}`);
  }

  res.json({
    success: true,
    message: "New OTP sent. Check your email.",
  });
});

// 5. LOGIN (Standard Email/Password)
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const emailLower = email.toLowerCase();

  const user = await User.findOne({ email: emailLower }).select(
    "+password +isEmailVerified +emailOTP +emailOTPExpires",
  );

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Invalid email or password",
    });
  }

  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    return res.status(401).json({
      success: false,
      message: "Invalid email or password",
    });
  }

  // Check Email Verification
  if (!user.isEmailVerified) {
    // Generate new OTP automatically
    const otp = EmailService.generateOTP();
    user.emailOTP = otp;
    user.emailOTPExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    console.log(`🔑 Unverified login - new OTP for ${emailLower}: ${otp}`);

    try {
      await EmailService.sendOTPEmail(emailLower, otp, user.name);
    } catch (emailError) {
      console.error(`❌ Failed to send email: ${emailError.message}`);
    }

    return res.status(403).json({
      success: false,
      message: "Please verify your email first. A new code has been sent.",
      requiresVerification: true,
      userId: user._id,
    });
  }

  // Update last login
  user.lastLoginAt = new Date();
  await user.save();

  const token = generateToken(user._id, user.role);

  res.json({
    success: true,
    message: "Login successful",
    token,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      walletBalance: user.walletBalance,
    },
  });
});

// 6. GET PROFILE
const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.userId);
  res.json({ success: true, data: user });
});

// 7. UPDATE PROFILE
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

// 8. CHANGE PASSWORD
const changePassword = asyncHandler(async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;

    console.log(`🔑 Password change attempt for User ID: ${userId}`);

    const user = await User.findById(userId).select("+password");

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return res
        .status(401)
        .json({ success: false, message: "Current password is incorrect" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    user.password = hashedPassword;
    await user.save();

    console.log(`✅ Password changed successfully for user: ${user.email}`);

    res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("❌ Change password error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to change password",
    });
  }
});

// 9. FORGOT PASSWORD
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const emailLower = email.toLowerCase();

  console.log(`🔑 Forgot password requested for: ${emailLower}`);

  const user = await User.findOne({ email: emailLower });

  if (!user) {
    // Security: Don't reveal if user exists
    return res.json({
      success: true,
      message: "If your email is registered, a reset code will be sent.",
    });
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedOTP = await bcrypt.hash(otp, 10);

  user.resetPasswordToken = hashedOTP;
  user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  await user.save();

  console.log(`🔑 Reset OTP for ${emailLower}: ${otp}`);

  try {
    await EmailService.sendPasswordResetEmail(emailLower, otp, user.name);
    console.log(`📧 Reset email sent to: ${emailLower}`);

    res.json({
      success: true,
      message: "Reset code sent to your email.",
    });
  } catch (error) {
    console.error(`❌ Failed to send email: ${error.message}`);
    // Dev Mode only: return OTP
    if (process.env.NODE_ENV === "development") {
      return res.json({
        success: true,
        message: "DEV MODE: Check logs for OTP",
        dev_otp: otp,
      });
    }
    res.json({
      success: true,
      message: "Reset code sent to your email.",
    });
  }
});

// 10. RESET PASSWORD
const resetPassword = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;
  const emailLower = email.toLowerCase();

  console.log(`🔑 Reset password attempt for: ${emailLower}`);

  const user = await User.findOne({ email: emailLower }).select(
    "+resetPasswordToken +resetPasswordExpires",
  );

  if (!user || !user.resetPasswordToken || !user.resetPasswordExpires) {
    return res.status(400).json({
      success: false,
      message: "Invalid or expired reset code.",
    });
  }

  if (user.resetPasswordExpires < Date.now()) {
    return res.status(400).json({
      success: false,
      message: "Reset code has expired. Please request a new one.",
    });
  }

  const isValidOTP = await bcrypt.compare(otp, user.resetPasswordToken);

  if (!isValidOTP) {
    console.log(`❌ Invalid OTP for ${emailLower}`);
    return res.status(400).json({
      success: false,
      message: "Invalid reset code.",
    });
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);

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

module.exports = {
  register,
  verifyEmail,
  resendOTP,
  login,
  googleLogin,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
};
