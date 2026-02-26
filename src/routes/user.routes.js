// routes/user.routes.js

const express = require("express");
const router = express.Router();
const userController = require("../controller/user.controller"); 
 const {
  register,
  verifyEmail,
  resendOTP,
  login,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
} = require("../controller/user.controller");
const { authenticate } = require("../middlewares/authMiddleware");

// Test endpoint
router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Auth API is working!",
    timestamp: new Date().toISOString(),
  });
});

// Public routes (no auth required)
router.post("/register", register);
router.post("/google", userController.googleLogin);
router.post("/verify-email", verifyEmail);
router.post("/resend-otp", resendOTP);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// Protected routes (auth required)
router.get("/me", authenticate, getProfile);
router.put("/profile", authenticate, updateProfile);
router.post("/change-password", authenticate, changePassword);
 

module.exports = router;
