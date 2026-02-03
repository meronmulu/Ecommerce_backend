const axios = require("axios");
const Payment = require("../models/payment.model");
const Order = require("../models/order.model");

// INIT PAYMENT (No changes needed)
const initPayment = async (req, res) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findById(orderId).populate("buyerId");
    const tx_ref = `tx-${Date.now()}`;

    await Payment.create({
      user: req.user.userId,
      order: order._id,
      amount: order.amount,
      tx_ref,
    });

    const response = await axios.post(
      "https://api.chapa.co/v1/transaction/initialize",
      {
        amount: order.amount,
        currency: "ETB",
        email: order.buyerId.email,
        tx_ref,
        callback_url: `${process.env.BASE_URL}/api/payment/callback`,
        return_url: "http://localhost:3000/payment-success",
      },
      { headers: { Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}` } },
    );
    res.json({ success: true, checkout_url: response.data.data.checkout_url });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// CALLBACK (Modified for Socket.io)
const chapaCallback = async (req, res) => {
  try {
    const { tx_ref } = req.body;

    // Find payment
    const payment = await Payment.findOne({ tx_ref }).populate("order");

    if (!payment) return res.status(404).json({ message: "Payment not found" });
    if (payment.status === "SUCCESS")
      return res.status(200).send("Already processed");

    // 1. Update DB
    payment.status = "SUCCESS";
    await payment.save();

    payment.order.status = "ESCROW_HELD";
    await payment.order.save();

    // 2. SOCKET EMIT (Notify the User's App)
    const io = req.app.get("socketio");

    // We send this to the User ID who made the payment
    io.to(payment.user.toString()).emit("payment_status", {
      status: "SUCCESS",
      orderId: payment.order._id,
      message: "Payment received! Funds secured in Escrow.",
    });

    console.log(`Payment Verified for ${payment.user}`);
    res.status(200).send("OK");
  } catch (error) {
    console.error("Payment Error:", error);
    res.status(500).send("Error");
  }
};

module.exports = { initPayment, chapaCallback };
