// 1. Load environment variables FIRST
require("dotenv").config();

const express = require("express");
const userRoutes = require("./src/routes/user.routes");
const productRoutes = require("./src/routes/product.routes");
const orderRoutes = require("./src/routes/order.routes")
const paymentRoutes = require("./src/routes/payment.routes");
const withdrawalRoutes = require("./src/routes/withdrawal.routes");
const chatRoutes = require("./src/routes/chat.routes");




const connectDB = require("./src/config/db");

const app = express();

// 2. Connect to Database
connectDB();



app.use(express.json());
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/withdrawal", withdrawalRoutes);
app.use("/api/chat", chatRoutes);







const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
