// index.js (in root directory)

require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const cors = require("cors");
const connectDB = require("./src/config/db");
const errorMiddleware = require("./src/middlewares/errorMiddleware");

const app = express();
const server = http.createServer(app);

// Socket.io setup
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
app.use("/uploads", express.static(path.join(__dirname, "src/uploads")));

// Make io accessible to routes
app.set("socketio", io);

// Socket.io connection
io.on("connection", (socket) => {
  console.log(`🔌 Socket Connected: ${socket.id}`);

  socket.on("join_user_room", (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined room`);
  });

  socket.on("disconnect", () => {
    console.log("🔌 Socket Disconnected");
  });
});

// Connect to MongoDB
connectDB();

// Routes
app.use("/api/users", require("./src/routes/user.routes"));
app.use("/api/products", require("./src/routes/product.routes"));
app.use("/api/chat", require("./src/routes/chat.routes"));
app.use("/api/orders", require("./src/routes/order.routes"));
app.use("/api/withdrawals", require("./src/routes/withdrawal.routes"));
app.use("/api/payments", require("./src/routes/payment.routes")); // Also adding payments which was missing

// Root route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Used Tech Market API",
    version: "1.0.0",
    endpoints: {
      test: "GET /api/users/test",
      register: "POST /api/users/register",
      verifyEmail: "POST /api/users/verify-email",
      login: "POST /api/users/login",
      forgotPassword: "POST /api/users/forgot-password",
      resetPassword: "POST /api/users/reset-password",
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Error handler
app.use(errorMiddleware);

const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📧 Email configured for: ${process.env.EMAIL_USER}`);
  console.log(`🔗 Test endpoint: http://localhost:${PORT}/api/users/test`);
});
