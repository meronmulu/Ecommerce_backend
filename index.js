// 1. Load environment variables FIRST
require("dotenv").config();

const express = require("express");
const connectDB = require("./src/config/db"); // Import the function

const app = express();

// 2. Connect to Database
connectDB();

app.use(express.json()); // Allow JSON data

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(` Server running on port ${PORT}`);
});
