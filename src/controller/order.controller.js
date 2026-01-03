const Order = require("../models/order.model");
const Product = require("../models/product.model");
const { createTransaction } = require("./transaction.controller");

// Create order with wallet payment
const User = require("../models/user.model");

const createWalletOrder = async (req, res) => {
  try {
    const { productId } = req.body;
    const buyerId = req.user.userId;

    const buyer = await User.findById(buyerId);
    if (!buyer) return res.status(404).json({ message: "User not found" });

    const product = await Product.findById(productId);
    if (!product || product.status !== "ACTIVE") {
      return res.status(400).json({ message: "Product not available" });
    }

    if (buyer.walletBalance < product.price) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    const order = await Order.create({
      buyerId,
      sellerId: product.sellerId,
      productId: product._id,
      amount: product.price,
      paymentMethod: "WALLET",
      status: "COMPLETED",
    });

    buyer.walletBalance -= product.price;
    await buyer.save();

    product.status = "SOLD";
    await product.save();

    res.json({ message: "Payment successful", order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// Buyer orders
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ buyerId: req.user.userId })
      .populate("productId", "title price category")
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Seller sold products
const getSoldProducts = async (req, res) => {
  try {
    const orders = await Order.find({ sellerId: req.user.userId })
      .populate("productId", "title price category")
      .populate("buyerId", "name email")
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { createWalletOrder, getMyOrders, getSoldProducts };
