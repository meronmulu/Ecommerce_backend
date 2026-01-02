const Order = require("../models/Order");
const Product = require("../models/Product");
const { createTransaction } = require("./transaction.controller");

// Create order with wallet payment
const createWalletOrder = async (req, res) => {
  try {
    const { productId } = req.body;
    const buyerId = req.user._id;

    const product = await Product.findById(productId);
    if (!product || product.status !== "ACTIVE")
      return res.status(400).json({ message: "Product not available" });

    if (req.user.walletBalance < product.price)
      return res.status(400).json({ message: "Insufficient wallet balance" });

    // Create order
    const order = await Order.create({
      buyerId,
      sellerId: product.sellerId,
      productId: product._id,
      amount: product.price,
      paymentMethod: "WALLET",
      status: "COMPLETED",
    });

    // Log wallet transaction (debit)
    await createTransaction({
      userId: buyerId,
      orderId: order._id,
      type: "DEBIT",
      amount: product.price,
      reason: `Purchase of ${product.title}`,
    });

    // Mark product as SOLD
    product.status = "SOLD";
    await product.save();

    res.json({ message: "Payment successful, order completed", order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get all orders of logged-in buyer
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ buyerId: req.user._id })
      .populate("productId", "title price category")
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get all products sold by logged-in seller
const getSoldProducts = async (req, res) => {
  try {
    const orders = await Order.find({ sellerId: req.user._id })
      .populate("productId", "title price category")
      .populate("buyerId", "name email")
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { createWalletOrder, getMyOrders, getSoldProducts };
