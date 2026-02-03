const express = require("express");
const router = express.Router();
const upload = require("../middlewares/upload");
const {
  createUser,
  verifyOtp,
  loginUser,
  requestVerification,
  adminVerifyUser,
  getUserProfile,
} = require("../controller/user.controller");
const {
  authenticateUser,
  authorizeRoles,
} = require("../middlewares/authMiddleware");

// Auth
router.post("/register", createUser);
router.post("/verify-otp", verifyOtp);
router.post("/login", loginUser);
router.get("/me", authenticateUser, getUserProfile);

// Blue Badge (KYC)
router.post(
  "/request-verification",
  authenticateUser,
  upload.single("nationalId"),
  requestVerification,
);
router.put(
  "/admin/verify-action",
  authenticateUser,
  authorizeRoles("ADMIN"),
  adminVerifyUser,
);

module.exports = router;
