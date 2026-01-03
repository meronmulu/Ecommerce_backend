const User = require("../models/user.model");
const { createTransaction } = require("./transaction.controller");

const addMoneyToWallet = async (req, res) => {
  try {
    const { amount } = req.body;
    const userId = req.user.userId;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    // DO NOT update wallet here
    await createTransaction({
      userId,
      type: "CREDIT",
      amount,
      reason: "Wallet top-up",
    });

    const user = await User.findById(userId);

    res.json({
      message: "Wallet topped up successfully",
      walletBalance: user.walletBalance,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


module.exports = { addMoneyToWallet };
