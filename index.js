// index.js

require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const cors = require("cors");
const connectDB = require("./src/config/db");
const startEscrowJob = require("./src/jobs/escrowJob");

// Connect to MongoDB
connectDB();

// Start escrow cron job
startEscrowJob();

// Setup Express & Socket.io
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (uploads)
app.use("/uploads", express.static(path.join(__dirname, "src/uploads")));

// Socket.io connection handling
io.on("connection", (socket) => {
  console.log(`>>> Socket Connected: ${socket.id}`);

  socket.on("join_user_room", (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined private notification room`);
  });

  socket.on("join_chat", (roomId) => {
    socket.join(roomId);
  });

  socket.on("disconnect", () => {
    console.log("Socket Disconnected");
  });
});

// Make io accessible to routes
app.set("socketio", io);

// Health check endpoint (useful for uptime monitoring)
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Root route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Used Tech Market API",
    version: "1.0.0",
    status: "running",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
    endpoints: {
      test: {
        method: "GET",
        url: "/api/users/test",
      },
      auth: {
        register: { method: "POST", url: "/api/users/register" },
        verifyEmail: { method: "POST", url: "/api/users/verify-email" },
        resendOTP: { method: "POST", url: "/api/users/resend-otp" },
        login: { method: "POST", url: "/api/users/login" },
        forgotPassword: { method: "POST", url: "/api/users/forgot-password" },
        resetPassword: { method: "POST", url: "/api/users/reset-password" },
        changePassword: { method: "POST", url: "/api/users/change-password" },
      },
      profile: {
        getProfile: { method: "GET", url: "/api/users/me" },
        updateProfile: { method: "PUT", url: "/api/users/profile" },
      },
      kyc: {
        requestVerification: {
          method: "POST",
          url: "/api/users/request-verification",
        },
      },
      products: {
        getAll: { method: "GET", url: "/api/products" },
        create: { method: "POST", url: "/api/products/add" },
      },
      orders: {
        create: { method: "POST", url: "/api/orders" },
        getMyOrders: { method: "GET", url: "/api/orders/my" },
        markShipped: { method: "PUT", url: "/api/orders/:id/shipped" },
        confirmDelivery: { method: "POST", url: "/api/orders/verify-delivery" },
        complete: { method: "PUT", url: "/api/orders/:id/complete" },
      },
      payment: {
        init: { method: "POST", url: "/api/payment/init" },
      },
      chat: {
        send: { method: "POST", url: "/api/chat" },
        get: { method: "GET", url: "/api/chat/:receiverId" },
      },
      withdrawals: {
        request: { method: "POST", url: "/api/withdrawals" },
      },
    },
  });
});

// Routes
app.use("/api/users", require("./src/routes/user.routes"));
app.use("/api/products", require("./src/routes/product.routes"));
app.use("/api/orders", require("./src/routes/order.routes"));
app.use("/api/payment", require("./src/routes/payment.routes"));
app.use("/api/chat", require("./src/routes/chat.routes"));
app.use("/api/withdrawals", require("./src/routes/withdrawal.routes"));

// ✅ FIXED: 404 handler for undefined routes (no wildcard needed)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl,
  });
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err);

  // Don't expose stack trace in production
  const error =
    process.env.NODE_ENV === "production"
      ? "Internal server error"
      : err.message;

  res.status(err.status || 500).json({
    success: false,
    message: error,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Promise Rejection:", err);
  // Don't exit the process in production
  if (process.env.NODE_ENV !== "production") {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
  // Don't exit the process in production
  if (process.env.NODE_ENV !== "production") {
    process.exit(1);
  }
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(
    `📧 Email configured for: ${process.env.EMAIL_USER || "Not set"}`,
  );
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🔗 Test endpoint: http://localhost:${PORT}/api/users/test`);
});
