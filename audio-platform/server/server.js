const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const audioRoutes = require("./routes/audioRoutes");
const streamRoutes = require("./routes/streamRoutes");
const consensusRoutes = require("./routes/consensusRoutes");

const app = express();

app.use(cors());
app.use(express.json());

const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  process.env.MONGO_URL ||
  "mongodb://127.0.0.1:27017/audioDB";

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log(`Connected to MongoDB at ${MONGO_URI}`);

    app.use("/api/audio", audioRoutes);
    app.use("/api/stream", streamRoutes);
    app.use("/api/consensus", consensusRoutes);

    const PORT = process.env.PORT || 5001;

    app.listen(PORT, () => {
        console.log(
        `${process.env.NODE_ID} running on port ${PORT}`
        );
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  });