// ============================================
// server.js
// ============================================

const path = require("path");

const express = require("express");

const mongoose = require("mongoose");

const cors = require("cors");

require("dotenv").config({
  path: path.resolve(__dirname, ".env"),
});

// ============================================
// Routes
// ============================================

const audioRoutes = require("./routes/audioRoutes");

const streamRoutes = require("./routes/streamRoutes");

const consensusRoutes = require("./routes/consensusRoutes");

// ============================================
// App Init
// ============================================

const app = express();

// ============================================
// Middleware
// ============================================

app.use(cors());

app.use(express.json());

// ============================================
// Routes
// IMPORTANT:
// DO NOT USE consensusRoutes()
// ============================================

app.use("/api/audio", audioRoutes);

app.use("/api/stream", streamRoutes);

app.use("/api/consensus", consensusRoutes);

// ============================================
// MongoDB Connection
// ============================================

const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  process.env.MONGO_URL ||
  "mongodb://127.0.0.1:27017/audioDB";

// ============================================
// Node Config
// ============================================

const NODE_ID =
  process.env.NODE_ID || "node1";

const PORT =
  process.env.PORT || 5001;

// ============================================
// Connect Database
// ============================================

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log(
      `Connected to MongoDB at ${MONGO_URI}`
    );

    // ============================================
    // Start Server
    // ============================================

    app.listen(PORT, () => {
      console.log(`
=================================
🚀 ${NODE_ID} running on port ${PORT}
=================================
`);
    });
  })
  .catch((err) => {
    console.error(
      "MongoDB connection error:",
      err.message
    );

    process.exit(1);
  });

// ============================================
// Root Route
// ============================================

app.get("/", (req, res) => {
  res.json({
    message:
      "Distributed Audio Platform Backend Running",

    node: NODE_ID,

    port: PORT,
  });
});