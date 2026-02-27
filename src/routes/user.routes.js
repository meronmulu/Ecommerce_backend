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
const upload = require("../middlewares/upload");

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
router.put("/profile", authenticate, upload.single('profileImage'), updateProfile);
router.post("/change-password", authenticate, changePassword);
router.post(
  "/request-verification", 
  authenticate, 
  // CHANGED: Accept 3 specific files
  upload.fields([
    { name: 'frontImage', maxCount: 1 },
    { name: 'backImage', maxCount: 1 },
    { name: 'faceImage', maxCount: 1 }
  ]), 
  userController.requestVerification
);
 

module.exports = router;
