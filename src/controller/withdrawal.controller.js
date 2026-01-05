const Withdrawal = require("../models/withdrawal.model");
const User = require("../models/user.model");

// SELLER REQUEST WITHDRAWAL
const requestWithdrawal = async (req, res) => {
  try {
    const { amount, bankName, accountNumber } = req.body;

    const user = await User.findById(req.user.userId);

    if (user.walletBalance < amount) {
      return res.status(400).json({ message: "Insufficient wallet balance" });
    }

    const withdrawal = await Withdrawal.create({
      sellerId: user._id,
      amount,
      bankName,
      accountNumber,
    });

    // deduct immediately (lock funds)
    user.walletBalance -= amount;
    await user.save();

    res.status(201).json({
      success: true,
      message: "Withdrawal request sent",
      data: withdrawal,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ADMIN APPROVE
// const approveWithdrawal = async (req, res) => {
//   const withdrawal = await Withdrawal.findById(req.params.id);
//   if (!withdrawal) return res.status(404).json({ message: "Not found" });

//   withdrawal.status = "APPROVED";
//   await withdrawal.save();

//   res.json({ success: true, message: "Withdrawal approved" });
// };

module.exports = { requestWithdrawal };
