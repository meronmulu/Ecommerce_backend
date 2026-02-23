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

// 1. REGISTER - Creates user and returns OTP in response for testing
const createUser = asyncHandler(async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const emailLower = email.toLowerCase();

    console.log(`📝 Registration attempt for: ${emailLower}`);

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email: emailLower });

    if (existingUser) {
      // If user exists but not verified, allow re-registration
      if (!existingUser.isEmailVerified) {
        // Delete old unverified user
        await User.findByIdAndDelete(existingUser._id);
        console.log(`🗑️ Deleted unverified user: ${emailLower}`);
      } else {
        return res.status(400).json({
          success: false,
          message: "Email already registered. Please login.",
        });
      }
    }

    // Generate OTP
    const otp = EmailService.generateOTP();
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await User.create({
      name,
      email: emailLower,
      password: hashedPassword,
      emailOTP: otp,
      emailOTPExpires: Date.now() + 10 * 60 * 1000, // 10 minutes
      isEmailVerified: false,
      walletBalance: 0,
      role: "USER",
    });

    console.log(`✅ User created: ${user._id}`);
    console.log(`🔑 OTP for ${emailLower}: ${otp}`); // Log OTP for testing

    // Try to send email, but don't fail if it doesn't work
    try {
      await EmailService.sendOTPEmail(emailLower, otp, name);
      console.log(`📧 Email sent to: ${emailLower}`);
    } catch (emailError) {
      console.log(`⚠️ Email sending failed, but user created: ${emailLower}`);
      // Continue anyway - user can use OTP from logs
    }

    // Return success with userId (OTP is in server logs)
    res.status(201).json({
      success: true,
      message: "Registration successful. Check server logs for OTP.",
      userId: user._id,
      requiresVerification: true,
    });
  } catch (error) {
    console.error("❌ Registration error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
});

// 2. VERIFY EMAIL OTP
const verifyEmailOTP = asyncHandler(async (req, res) => {
  try {
    const { userId, otp } = req.body;

    console.log(`🔐 Verification attempt for user: ${userId}`);

    const user = await User.findById(userId).select(
      "+emailOTP +emailOTPExpires",
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if already verified
    if (user.isEmailVerified) {
      const token = generateToken(user._id, user.role);
      return res.json({
        success: true,
        message: "Email already verified",
        token,
        user,
      });
    }

    // Verify OTP
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

    console.log(`✅ Email verified for: ${user.email}`);

    res.json({
      success: true,
      message: "Email verified successfully",
      token,
      user,
    });
  } catch (error) {
    console.error("❌ Verification error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Verification failed",
    });
  }
});

// 3. RESEND OTP
const resendOTP = asyncHandler(async (req, res) => {
  try {
    const { email } = req.body;
    const emailLower = email.toLowerCase();

    console.log(`🔄 Resend OTP for: ${emailLower}`);

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

    // Generate new OTP
    const otp = EmailService.generateOTP();

    user.emailOTP = otp;
    user.emailOTPExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    console.log(`🔑 New OTP for ${emailLower}: ${otp}`);

    // Try to send email
    try {
      await EmailService.sendOTPEmail(emailLower, otp, user.name);
    } catch (emailError) {
      console.log(`⚠️ Email resend failed: ${emailLower}`);
    }

    res.json({
      success: true,
      message: "New verification code sent. Check server logs.",
    });
  } catch (error) {
    console.error("❌ Resend error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to resend code",
    });
  }
});

// 4. LOGIN
const loginUser = asyncHandler(async (req, res) => {
  try {
    const { email, password } = req.body;
    const emailLower = email.toLowerCase();

    console.log(`🔐 Login attempt for: ${emailLower}`);

    const user = await User.findOne({ email: emailLower }).select(
      "+password +isEmailVerified",
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      // Generate new OTP
      const otp = EmailService.generateOTP();
      user.emailOTP = otp;
      user.emailOTPExpires = Date.now() + 10 * 60 * 1000;
      await user.save();

      console.log(`🔑 Login - Unverified user OTP: ${otp}`);

      return res.status(403).json({
        success: false,
        message: "Please verify your email first. Check server logs for OTP.",
        requiresVerification: true,
        userId: user._id,
      });
    }

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    const token = generateToken(user._id, user.role);

    console.log(`✅ Login successful: ${user.email}`);

    res.json({
      success: true,
      message: "Login successful",
      token,
      user,
    });
  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Login failed",
    });
  }
});

const getUserProfile = asyncHandler(async (req, res) => {
  try {
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
  } catch (error) {
    console.error("❌ Profile error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get profile",
    });
  }
});

// 6. UPDATE PROFILE
const updateProfile = asyncHandler(async (req, res) => {
  try {
    const { name, phone } = req.body;
    const updates = {};

    if (name) updates.name = name;
    if (phone) updates.phone = phone;

    const user = await User.findByIdAndUpdate(req.user.userId, updates, {
      new: true,
      runValidators: true,
    });

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: user,
    });
  } catch (error) {
    console.error("❌ Update profile error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update profile",
    });
  }
});

// 7. FORGOT PASSWORD
const forgotPassword = asyncHandler(async (req, res) => {
  try {
    const { email } = req.body;
    const emailLower = email.toLowerCase();

    console.log(`🔑 Forgot password for: ${emailLower}`);

    const user = await User.findOne({ email: emailLower });

    if (!user) {
      // Don't reveal if user exists
      return res.json({
        success: true,
        message: "If email exists, reset code will be sent.",
      });
    }

    // Generate reset OTP
    const otp = EmailService.generateOTP();
    const hashedOTP = await bcrypt.hash(otp, 10);

    user.resetPasswordToken = hashedOTP;
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    console.log(`🔑 Reset OTP for ${emailLower}: ${otp}`);

    // Try to send email
    try {
      await EmailService.sendPasswordResetEmail(emailLower, otp, user.name);
    } catch (emailError) {
      console.log(`⚠️ Reset email failed: ${emailLower}`);
    }

    res.json({
      success: true,
      message: "Reset code sent. Check server logs.",
    });
  } catch (error) {
    console.error("❌ Forgot password error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to process request",
    });
  }
});

// 8. RESET PASSWORD
const resetPassword = asyncHandler(async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const emailLower = email.toLowerCase();

    console.log(`🔐 Reset password for: ${emailLower}`);

    const user = await User.findOne({ email: emailLower }).select(
      "+resetPasswordToken +resetPasswordExpires",
    );

    if (
      !user ||
      !user.resetPasswordToken ||
      user.resetPasswordExpires < Date.now()
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset code",
      });
    }

    const isValid = await bcrypt.compare(otp, user.resetPasswordToken);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid reset code",
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
      message: "Password reset successful. You can now login.",
    });
  } catch (error) {
    console.error("❌ Reset password error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to reset password",
    });
  }
});

// 9. CHANGE PASSWORD (authenticated)
const changePassword = asyncHandler(async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.userId).select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;
    await user.save();

    console.log(`✅ Password changed for user: ${user.email}`);

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

module.exports = {
  createUser,
  verifyEmailOTP,
  resendOTP,
  loginUser,
  getUserProfile,
  updateProfile,
  forgotPassword,
  resetPassword,
  changePassword,
};
