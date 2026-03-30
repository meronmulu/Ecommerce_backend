const mongoose = require("mongoose");
const cron = require("node-cron");
const Order = require("../models/order.model");
const User = require("../models/user.model");
const Product = require("../models/product.model");

const startEscrowJob = () => {
  // Run every hour: "0 * * * *"
  cron.schedule("0 * * * *", async () => {
    console.log(">>> [CRON] Checking for expired Escrow timers...");

    const now = new Date();

    // Find orders that are DELIVERED and the 24h window has passed
    const expiredOrders = await Order.find({
      status: "DELIVERED",
      autoConfirmAt: { $lte: now }, // Time is less than or equal to now
    });

    for (const order of expiredOrders) {
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        // 1. Give money to Seller (Atomic)
        await User.findByIdAndUpdate(order.sellerId, 
          { $inc: { walletBalance: order.amount } },
          { session }
        );

        // 2. Mark Product Sold
        await Product.findByIdAndUpdate(order.productId, 
          { status: "SOLD" },
          { session }
        );

        // 3. Mark Order Completed
        order.status = "COMPLETED";
        await order.save({ session });

        await session.commitTransaction();
        console.log(`>>> [CRON] Auto-completed Order ID: ${order._id}`);
      } catch (err) {
        await session.abortTransaction();
        console.error(`>>> [CRON] Error processing Order ${order._id}:`, err);
      } finally {
        session.endSession();
      }
    }
  });
};

module.exports = startEscrowJob;
