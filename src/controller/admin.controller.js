const User = require("../models/user.model");
const Product = require("../models/product.model");
const Withdrawal = require("../models/withdrawal.model");
const Order = require("../models/order.model");

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// 1. Get All Users (with optional role and kyc status filters)
const getAllUsers = asyncHandler(async (req, res) => {
  const { role, kycStatus, search, limit = 50, page = 1 } = req.query;
  const query = {};

  if (role) query.role = role.toUpperCase();
  if (kycStatus) query["kyc.status"] = kycStatus.toUpperCase();
  
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
    ];
  }

  const skip = (page - 1) * limit;

  const users = await User.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .lean();

  const total = await User.countDocuments(query);

  res.json({
    success: true,
    data: users,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
    },
  });
});

// 2. Get Pending KYC Users
const getPendingKyc = asyncHandler(async (req, res) => {
  const users = await User.find({ "kyc.status": "PENDING" })
    .sort({ "kyc.submittedAt": 1 })
    .lean();
  res.json({ success: true, data: users });
});

// 3. Approve KYC
const approveKyc = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const user = await User.findById(userId);

  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  if (user.kyc.status !== "PENDING") {
    return res.status(400).json({ success: false, message: "User KYC is not pending" });
  }

  user.kyc.status = "APPROVED";
  user.kyc.reviewedAt = new Date();
  user.role = "VERIFIED_SELLER"; // Upgrade role
  
  await user.save();

  res.json({ success: true, message: "KYC Approved and user upgraded to VERIFIED_SELLER", data: user });
});

// 4. Reject KYC
const rejectKyc = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { reason } = req.body;

  if (!reason) {
    return res.status(400).json({ success: false, message: "Rejection reason is required" });
  }

  const user = await User.findById(userId);

  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  if (user.kyc.status !== "PENDING") {
    return res.status(400).json({ success: false, message: "User KYC is not pending" });
  }

  user.kyc.status = "REJECTED";
  user.kyc.reviewedAt = new Date();
  user.kyc.rejectionReason = reason;
  
  await user.save();

  res.json({ success: true, message: "KYC Rejected", data: user });
});

// 5. Get Pending Withdrawals
const getPendingWithdrawals = asyncHandler(async (req, res) => {
  const withdrawals = await Withdrawal.find({ status: "PENDING" })
    .populate("sellerId", "name email phone kyc")
    .sort({ createdAt: 1 })
    .lean();
  res.json({ success: true, data: withdrawals });
});

// 6. Approve Withdrawal
const approveWithdrawal = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const withdrawal = await Withdrawal.findById(id);

  if (!withdrawal) {
    return res.status(404).json({ success: false, message: "Withdrawal not found" });
  }

  if (withdrawal.status !== "PENDING") {
    return res.status(400).json({ success: false, message: "Withdrawal is not pending" });
  }

  withdrawal.status = "APPROVED";
  await withdrawal.save();

  res.json({ success: true, message: "Withdrawal approved", data: withdrawal });
});

// 7. Reject Withdrawal
const rejectWithdrawal = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body; // Optional reason

  const withdrawal = await Withdrawal.findById(id);

  if (!withdrawal) {
    return res.status(404).json({ success: false, message: "Withdrawal not found" });
  }

  if (withdrawal.status !== "PENDING") {
    return res.status(400).json({ success: false, message: "Withdrawal is not pending" });
  }

  withdrawal.status = "REJECTED";
  await withdrawal.save();

  // Refund the user
  await User.findByIdAndUpdate(withdrawal.sellerId, {
    $inc: { walletBalance: withdrawal.amount }
  });

  res.json({ success: true, message: "Withdrawal rejected and amount refunded", data: withdrawal });
});

module.exports = {
  getAllUsers,
  getPendingKyc,
  approveKyc,
  rejectKyc,
  getPendingWithdrawals,
  approveWithdrawal,
  rejectWithdrawal,
};
