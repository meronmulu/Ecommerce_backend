const axios = require("axios");
const Payment = require("../models/payment.model");
const Order = require("../models/order.model");
const User = require("../models/user.model");

/** INITIATE PAYMENT */
const initPayment = async (req, res) => {
  try {
    const { orderId } = req.body;

    // Populate the correct schema fields
    const order = await Order.findById(orderId)
      .populate("buyerId", "name email walletBalance")
      .populate("sellerId", "name email walletBalance");

    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.status !== "PENDING") {
      return res.status(400).json({ message: "Order already paid" });
    }

    const tx_ref = `tx-${Date.now()}`;

    // Create payment record
    const payment = await Payment.create({
      user: order.buyerId._id,
      order: order._id,
      amount: order.totalAmount || order.amount,
      tx_ref,
    });

    // Initialize Chapa payment
    const response = await axios.post(
      "https://api.chapa.co/v1/transaction/initialize",
      {
        amount: order.totalAmount || order.amount,
        currency: "ETB",
        email: order.buyerId.email,
        tx_ref,
        callback_url: `${process.env.BASE_URL}/api/payment/callback`,
        return_url: process.env.CHAPA_RETURN_URL || "http://localhost:5173/payment-success",
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}`,
        },
      }
    );

    res.json({
      success: true,
      checkout_url: response.data.data.checkout_url,
      tx_ref,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/** CALLBACK / MANUAL VERIFY */
const chapaCallback = async (req, res) => {
  try {
    const { tx_ref } = req.body;

    // Verify transaction from Chapa
    const verify = await axios.get(
      `https://api.chapa.co/v1/transaction/verify/${tx_ref}`,
      {
        headers: { Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}` },
      }
    );

    if (verify.data.status !== "success") {
      return res.status(400).json({ message: "Payment failed" });
    }

    // Find payment and populate seller
    const payment = await Payment.findOne({ tx_ref }).populate({
      path: "order",
      populate: { path: "sellerId", select: "name walletBalance" },
    });

    if (!payment) return res.status(404).json({ message: "Payment not found" });
    if (payment.status === "SUCCESS") return res.status(200).json({ message: "Already processed" });

    // Update payment
    payment.status = "SUCCESS";
    await payment.save();

    // Update order
    payment.order.status = "PAID";
    await payment.order.save();

    // Credit seller wallet safely
    const seller = payment.order.sellerId;
    seller.walletBalance = (seller.walletBalance || 0) + payment.amount;
    await seller.save();

    res.json({ success: true, message: "Payment verified successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { initPayment, chapaCallback };
