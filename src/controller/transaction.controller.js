const Transaction = require("../models/Transaction");
const User = require("../models/User");

// Create a transaction (can be used by order controller or top-up)
const createTransaction = async ({ userId, orderId = null, type, amount, reason }) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  let balanceAfter = user.walletBalance;
  if (type === "DEBIT") balanceAfter -= amount;
  if (type === "CREDIT") balanceAfter += amount;

  if (balanceAfter < 0) throw new Error("Insufficient balance");

  const transaction = await Transaction.create({
    userId,
    orderId,
    type,
    amount,
    reason,
    balanceAfter,
  });

  // Update wallet balance
  user.walletBalance = balanceAfter;
  await user.save();

  return transaction;
};

// Top-up wallet
const topUpWallet = async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0)
      return res.status(400).json({ message: "Invalid amount" });

    const transaction = await createTransaction({
      userId: req.user._id,
      type: "CREDIT",
      amount,
      reason: "Wallet Top-Up",
    });

    res.json({ message: "Wallet topped up successfully", walletBalance: transaction.balanceAfter });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get logged-in user's transaction history
const getMyTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { createTransaction, topUpWallet, getMyTransactions };
