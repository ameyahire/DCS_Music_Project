const mongoose = require("mongoose");

const audioSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },

    filename: {
      type: String,
      required: true,
    },

    primaryNode: {
      type: String,
      required: true,
    },

    replicaNode: {
      type: String,
      required: true,
    },

    backupNode: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "Audio",
  audioSchema
);