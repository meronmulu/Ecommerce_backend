// 1. Load environment variables FIRST
require("dotenv").config();

const express = require("express");
const userRoutes = require("./src/routes/user.routes");
const connectDB = require("./src/config/db");

const app = express();

// 2. Connect to Database
connectDB();

app.use(express.json());
app.use("/api/users", userRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
