require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const cors = require("cors");
const connectDB = require("./src/config/db");
const startEscrowJob = require("./src/jobs/escrowJob");

connectDB();

startEscrowJob();

// 3. Setup Express & Socket.io
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

app.use("/uploads", express.static(path.join(__dirname, "src/uploads")));

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

app.set("socketio", io);

app.use("/api/users", require("./src/routes/user.routes"));
app.use("/api/products", require("./src/routes/product.routes"));
app.use("/api/orders", require("./src/routes/order.routes"));
app.use("/api/payment", require("./src/routes/payment.routes"));
app.use("/api/chat", require("./src/routes/chat.routes"));
app.use("/api/withdrawals", require("./src/routes/withdrawal.routes"));

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
