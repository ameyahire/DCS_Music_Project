const mongoose = require("mongoose");

const audioSchema = new mongoose.Schema({
  title: String,
  filename: String,
  primaryNode: String,
  replicaNode: String,
  backupNode: String,
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Audio", audioSchema);