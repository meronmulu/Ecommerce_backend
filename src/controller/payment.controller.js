const axios = require("axios");
const Payment = require("../models/payment.model");
const Order = require("../models/order.model");

/** INITIATE PAYMENT */
const initPayment = async (req, res) => {
  try {
    const { orderId } = req.body;

    const order = await Order.findById(orderId).populate("buyerId", "email"); // Minimized population for speed

    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.status !== "PENDING") {
      return res.status(400).json({ message: "Order is not in pending state" });
    }

    const tx_ref = `tx-${Date.now()}`;

    // Create payment record
    await Payment.create({
      user: req.user.userId, // From Auth Middleware
      order: order._id,
      amount: order.amount,
      tx_ref,
    });

    // Initialize Chapa
    const response = await axios.post(
      "https://api.chapa.co/v1/transaction/initialize",
      {
        amount: order.amount,
        currency: "ETB",
        email: order.buyerId.email,
        tx_ref,
        callback_url: `${process.env.BASE_URL}/api/payment/callback`,
        return_url: "http://localhost:3000/payment-success", // Or your Flutter deep link
      },
      {
        headers: { Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}` },
      },
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

/** CALLBACK / VERIFY (THE ESCROW FIX) */
const chapaCallback = async (req, res) => {
  try {
    const { tx_ref } = req.body;

    const verify = await axios.get(
      `https://api.chapa.co/v1/transaction/verify/${tx_ref}`,
      { headers: { Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}` } },
    );

    if (verify.data.status !== "success") {
      return res.status(400).json({ message: "Payment failed" });
    }

    const payment = await Payment.findOne({ tx_ref }).populate("order");

    if (!payment) return res.status(404).json({ message: "Payment not found" });
    if (payment.status === "SUCCESS")
      return res.status(200).json({ message: "Already processed" });

    // 1. Update Payment Record
    payment.status = "SUCCESS";
    await payment.save();

    // 2. Update Order Status to ESCROW_HELD (Money is safe with App)
    payment.order.status = "ESCROW_HELD";
    await payment.order.save();

    // NOTE: We do NOT add money to seller wallet yet. That happens in 'completeOrder'.

    res.json({
      success: true,
      message: "Payment verified. Funds held in Escrow.",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { initPayment, chapaCallback };
