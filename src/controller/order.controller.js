const Order = require("../models/order.model");
const Product = require("../models/product.model");

// CREATE ORDER
const createOrder = async (req, res) => {
  try {
    const product = await Product.findById(req.body.productId);

    if (!product || product.status !== "ACTIVE") {
      return res
        .status(400)
        .json({ success: false, message: "Product not available" });
    }

    // buyer cannot buy own product
    if (product.sellerId.toString() === req.user.userId) {
      return res.status(400).json({
        success: false,
        message: "You cannot buy your own product",
      });
    }

    const order = await Order.create({
      buyerId: req.user.userId,
      sellerId: product.sellerId,
      productId: product._id,
      amount: product.price,
    });

    res.status(201).json({
      success: true,
      message: "Order created",
      data: order,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET MY ORDERS (buyer or seller)
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      $or: [
        { buyerId: req.user.userId },
        { sellerId: req.user.userId },
      ],
    })
      .populate("productId", "title price")
      .populate("buyerId", "name")
      .populate("sellerId", "name");

    res.status(200).json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const cancelOrder = async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  if (order.status !== "PENDING") {
    return res
      .status(400)
      .json({ message: "Only pending orders can be cancelled" });
  }

  // buyer or admin only
  if (
    order.buyerId.toString() !== req.user.userId &&
    req.user.role !== "ADMIN"
  ) {
    return res.status(403).json({ message: "Not authorized" });
  }

  order.status = "CANCELLED";
  await order.save();

  res.json({ success: true, message: "Order cancelled" });
};

// GET ALL ORDERS 
const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("productId", "title price")
      .populate("buyerId", "name email")
      .populate("sellerId", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      total: orders.length,
      data: orders,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};



module.exports = {
  createOrder,
  getMyOrders,
  cancelOrder,
  getAllOrders
};
