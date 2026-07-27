const Withdrawal = require("../models/withdrawal.model");
const User = require("../models/user.model");

const requestWithdrawal = async (req, res) => {
  const { amount, bankName, accountNumber } = req.body;
  // ATOMIC DEDUCTION: Only deduct if balance >= amount
  const user = await User.findOneAndUpdate(
    { _id: req.user.userId, walletBalance: { $gte: amount } },
    { $inc: { walletBalance: -amount } },
    { new: true },
  );
  if (!user) return res.status(400).json({ message: "Insufficient Funds" });

  const w = await Withdrawal.create({
    sellerId: user._id,
    amount,
    bankName,
    accountNumber,
  });
  res.status(201).json({ success: true, data: w });
};

const getMyWithdrawals = async (req, res) => {
  try {
    const withdrawals = await Withdrawal.find({ sellerId: req.user.userId })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, data: withdrawals });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { requestWithdrawal, getMyWithdrawals };
