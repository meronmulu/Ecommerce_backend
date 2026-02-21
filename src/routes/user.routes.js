// server/routes/user.routes.js

const express = require("express");
const router = express.Router();
const upload = require("../middlewares/upload");
const {
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
} = require("../controller/user.controller");
const {
  authenticateUser,
  authorizeRoles,
} = require("../middlewares/authMiddleware");

// Test endpoint
router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Backend is working!",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "production",
  });
});

// Public routes
router.post("/register", createUser);
router.post("/verify-email", verifyEmailOTP);
router.post("/resend-otp", resendOTP);
router.post("/login", loginUser);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// Protected routes
router.get("/me", authenticateUser, getUserProfile);
router.put("/profile", authenticateUser, updateProfile);
router.post("/change-password", authenticateUser, changePassword);

// KYC routes
router.post(
  "/request-verification",
  authenticateUser,
  upload.single("nationalId"),
  requestVerification,
);

// Admin routes
router.get(
  "/admin/pending-verifications",
  authenticateUser,
  authorizeRoles("ADMIN"),
  async (req, res) => {
    const users = await User.find({ "kyc.status": "PENDING" }).select(
      "name email phone kyc.submittedAt",
    );
    res.json({ success: true, data: users });
  },
);

router.put(
  "/admin/verify-user",
  authenticateUser,
  authorizeRoles("ADMIN"),
  adminVerifyUser,
);

router.post("/test-email", async (req, res) => {
  try {
    const { email } = req.body;
    const EmailService = require("../services/emailService");

    console.log("🧪 Testing email send to:", email);
    console.log("📧 Email user:", process.env.EMAIL_USER);
    console.log("📧 Email pass length:", process.env.EMAIL_PASS?.length);

    const otp = EmailService.generateOTP();
    await EmailService.sendOTPEmail(email, otp, "Test User");

    res.json({
      success: true,
      message: "Test email sent successfully",
      otp: otp, // Include for testing
    });
  } catch (error) {
    console.error("❌ Test email error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
      error: error.toString(),
    });
  }
});

module.exports = router;
