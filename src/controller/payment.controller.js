const crypto = require("crypto");
const axios = require("axios");
const Payment = require("../models/payment.model");
const Order = require("../models/order.model");
const User = require("../models/user.model");

// INIT ORDER PAYMENT (Escrow)
const initPayment = async (req, res) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findById(orderId).populate("buyerId");
    if (!order) return res.status(404).json({ message: "Order not found" });

    const tx_ref = `tx-order-${Date.now()}`;

    await Payment.create({
      user: req.user.userId,
      order: order._id,
      amount: order.amount,
      tx_ref,
      type: "ORDER_PAYMENT",
    });

    const response = await axios.post(
      "https://api.chapa.co/v1/transaction/initialize",
      {
        amount: order.amount,
        currency: "ETB",
        email: order.buyerId.email,
        tx_ref,
        callback_url: `${process.env.BASE_URL}/api/payments/callback`,
        return_url: "http://localhost:3000/payment-success",
      },
      { headers: { Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}` } },
    );
    res.json({ 
      success: true, 
      checkout_url: response.data.data.checkout_url,
      tx_ref: tx_ref 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// INIT WALLET DEPOSIT
const initDeposit = async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ message: "Invalid amount" });

    const user = await User.findById(req.user.userId);
    const tx_ref = `tx-deposit-${Date.now()}`;

    await Payment.create({
      user: req.user.userId,
      amount,
      tx_ref,
      type: "DEPOSIT",
    });

    const response = await axios.post(
      "https://api.chapa.co/v1/transaction/initialize",
      {
        amount,
        currency: "ETB",
        email: user.email,
        tx_ref,
        callback_url: `${process.env.BASE_URL}/api/payments/callback`,
        return_url: "http://localhost:3000/payment-success",
      },
      { headers: { Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}` } },
    );
    res.json({ 
      success: true, 
      checkout_url: response.data.data.checkout_url,
      tx_ref: tx_ref 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// CALLBACK (Handles both Deposits and Order Payments)
const chapaCallback = async (req, res) => {
  try {
    // Webhook Signature Verification
    const secret = process.env.CHAPA_ENCRYPTION_KEY;
    const bodyString = JSON.stringify(req.body);
    const hash = crypto
      .createHmac("sha256", secret)
      .update(bodyString)
      .digest("hex");

    const chapaSignature = req.headers["x-chapa-signature"] || req.headers["chapa-signature"];
    
    if (hash !== chapaSignature) {
      console.warn("⚠️ Webhook signature mismatch!");
      console.warn("Expected:", hash);
      console.warn("Received:", chapaSignature);
      
      // OPTIONAL: In development, you might want to bypass this or log it heavily
      // For now, we continue to verify but log the failure
      if (process.env.NODE_ENV === "production") {
        return res.status(400).json({ message: "Invalid signature" });
      } else {
        console.log("🛠️ [DEV MODE] Allowing bypass for signature mismatch");
      }
    }

    const { tx_ref, status } = req.body;
    console.log(`>>> [WEBHOOK] Received for TX: ${tx_ref}, Status: ${status}`);

    const payment = await Payment.findOne({ tx_ref }).populate("order");
    if (!payment) {
      console.error(`>>> [WEBHOOK] Payment not found for tx_ref: ${tx_ref}`);
      return res.status(404).json({ message: "Payment not found" });
    }
    
    if (payment.status === "SUCCESS") {
      console.log(`>>> [WEBHOOK] Already processed: ${tx_ref}`);
      return res.status(200).send("Already processed");
    }

    if (status !== "success") {
       console.log(`>>> [WEBHOOK] Payment not successful in body: ${status}`);
       return res.status(200).send("Status not success");
    }

    payment.status = "SUCCESS";
    await payment.save();

    const io = req.app.get("socketio");

    if (payment.type === "ORDER_PAYMENT") {
      // Logic for Escrow
      payment.order.status = "ESCROW_HELD";
      await payment.order.save();

      io.to(payment.user.toString()).emit("payment_status", {
        status: "SUCCESS",
        type: "ORDER_PAYMENT",
        orderId: payment.order._id,
        message: "Payment received! Funds secured in Escrow.",
      });
    } else if (payment.type === "DEPOSIT") {
      // Logic for Wallet Deposit
      const user = await User.findById(payment.user);
      user.walletBalance = (user.walletBalance || 0) + payment.amount;
      await user.save();

      io.to(payment.user.toString()).emit("payment_status", {
        status: "SUCCESS",
        type: "DEPOSIT",
        amount: payment.amount,
        newBalance: user.walletBalance,
        message: `Successfully deposited ${payment.amount} ETB to your wallet!`,
      });
    }

    console.log(`✅ Payment Verified: ${payment.type} for USER ${payment.user}`);
    res.status(200).send("OK");
  } catch (error) {
    console.error("❌ Callback Error:", error);
    res.status(500).send("Error");
  }
};

// MANUAL VERIFICATION (For local testing without Webhooks)
const verifyPaymentManual = async (req, res) => {
  try {
    const { tx_ref } = req.params;
    console.log(`>>> [MANUAL] Verifying TX: ${tx_ref}`);

    // Call Chapa Verify API
    const response = await axios.get(
      `https://api.chapa.co/v1/transaction/verify/${tx_ref}`,
      { headers: { Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}` } }
    );

    console.log(">>> [MANUAL] Chapa Response:", response.data);

    const { status, data } = response.data;

    if (status !== "success") {
      return res.status(400).json({ success: false, message: "Payment not successful on Chapa" });
    }

    const payment = await Payment.findOne({ tx_ref }).populate("order");
    if (!payment) return res.status(404).json({ message: "Payment record not found" });

    // If already success, just return
    if (payment.status === "SUCCESS") {
      return res.json({ success: true, message: "Payment already verified", order: payment.order });
    }

    // Update status
    payment.status = "SUCCESS";
    await payment.save();

    const io = req.app.get("socketio");

    if (payment.type === "ORDER_PAYMENT" && payment.order) {
      payment.order.status = "ESCROW_HELD";
      await payment.order.save();

      // Emit real-time update
      if (io) {
        io.to(payment.user.toString()).emit("payment_status", {
          status: "SUCCESS",
          type: "ORDER_PAYMENT",
          orderId: payment.order._id,
          message: "Payment verified manually! Funds secured.",
        });
      }
    } else if (payment.type === "DEPOSIT") {
      const user = await User.findById(payment.user);
      user.walletBalance = (user.walletBalance || 0) + payment.amount;
      await user.save();

      if (io) {
        io.to(payment.user.toString()).emit("payment_status", {
          status: "SUCCESS",
          type: "DEPOSIT",
          amount: payment.amount,
          newBalance: user.walletBalance,
        });
      }
    }

    res.json({ success: true, message: "Payment verified successfully", order: payment.order });
  } catch (error) {
    console.error("❌ Manual Verification Error:", error.response?.data || error.message);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { initPayment, initDeposit, chapaCallback, verifyPaymentManual };
