// server/routes/user.routes.js

const express = require("express");
const router = express.Router();
const upload = require("../middlewares/upload");
const {
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
} = require("../controller/user.controller");
const {
  authenticateUser,
  authorizeRoles,
  loginRateLimiter,
} = require("../middlewares/authMiddleware");

// Public routes (no authentication required)
router.post("/register", createUser);
router.post("/verify-email", verifyEmailOTP); // Changed from verify-otp
router.post("/resend-otp", resendOTP); // New endpoint
router.post("/login", loginRateLimiter, loginUser);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// Protected routes (authentication required)
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

module.exports = router;
