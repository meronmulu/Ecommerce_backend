const User = require("../models/user.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// 1. REGISTER + OTP GENERATION
const createUser = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (await User.findOne({ email }))
      return res.status(400).json({ message: "Email exists" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const user = await User.create({
      name,
      email,
      phone,
      password: await bcrypt.hash(password, 10),
      otp,
      otpExpires: Date.now() + 600000, // 10 mins
    });

    console.log(`>>> MOCK SMS to ${phone}: OTP is ${otp} <<<`);
    res.status(201).json({
      success: true,
      message: "Registered. Check console for OTP.",
      userId: user._id,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 2. VERIFY PHONE OTP
const verifyOtp = async (req, res) => {
  try {
    const { userId, otp } = req.body;
    const user = await User.findById(userId);
    if (!user || user.otp !== otp || user.otpExpires < Date.now()) {
      return res.status(400).json({ message: "Invalid OTP" });
    }
    user.isPhoneVerified = true;
    user.otp = undefined;
    await user.save();

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );
    res.json({ success: true, token, user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 3. LOGIN
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );
    res.json({ success: true, token, user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 4. REQUEST BLUE BADGE (Upload ID)
const requestVerification = async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ message: "ID Image required" });
    const user = await User.findById(req.user.userId);

    if (user.role === "VERIFIED_SELLER")
      return res.status(400).json({ message: "Already verified" });

    user.kyc.status = "PENDING";
    user.kyc.idImage = req.file.path;
    user.kyc.submittedAt = Date.now();
    await user.save();
    res.json({ success: true, message: "Request sent to Admin." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 5. ADMIN APPROVES BLUE BADGE
const adminVerifyUser = async (req, res) => {
  try {
    const { userId, status } = req.body; // "APPROVED" or "REJECTED"
    const user = await User.findById(userId);

    if (status === "APPROVED") {
      user.kyc.status = "APPROVED";
      user.role = "VERIFIED_SELLER"; // Grants Blue Badge
    } else {
      user.kyc.status = "REJECTED";
    }
    await user.save();
    res.json({ success: true, message: `User is now ${user.role}` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get User Profile
const getUserProfile = async (req, res) => {
  const user = await User.findById(req.user.userId).select("-password -otp");
  res.json({ success: true, data: user });
};

module.exports = {
  createUser,
  verifyOtp,
  loginUser,
  requestVerification,
  adminVerifyUser,
  getUserProfile,
};
