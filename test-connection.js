const mongoose = require("mongoose");
require("dotenv").config();

const test = async () => {
    console.log("Starting connection test...");
    console.log("URI:", process.env.MONGO_URI);
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000,
        });
        console.log("✅ SUCCESS: Connected to MongoDB Atlas");
        process.exit(0);
    } catch (err) {
        console.error("❌ FAILURE: Could not connect");
        console.error("Error Name:", err.name);
        console.error("Error Message:", err.message);
        process.exit(1);
    }
};

test();
