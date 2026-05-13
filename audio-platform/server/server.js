const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const audioRoutes = require("./routes/audioRoutes");
const streamRoutes = require("./routes/streamRoutes");

const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect("mongodb://127.0.0.1:27017/audioDB");

app.use("/api/audio", audioRoutes);
app.use("/api/stream", streamRoutes);

app.listen(5000, () => console.log("Server running on port 5000"));