const express = require("express");
const multer = require("multer");
const Audio = require("../models/Audio");
const {
  getNextNode,
  saveFileToNode,
  replicateFile,
  deleteFileFromNode,
} = require("../utils/storageManager");

const router = express.Router();

// store file in memory instead of disk
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Upload API
router.post("/upload", upload.single("audio"), async (req, res) => {
  try {
    const filename = Date.now() + "-" + req.file.originalname;

    // 1. Select node
    const primaryNode = getNextNode();

    // 2. Save to primary
    saveFileToNode(req.file.buffer, filename, primaryNode);

    // 3. Replicate
    const replicaNode = replicateFile(
      req.file.buffer,
      filename,
      primaryNode
    );

    // 4. Save metadata
    const newAudio = new Audio({
      title: req.body.title,
      filename,
      primaryNode,
      replicaNode,
    });

    await newAudio.save();

    res.json({
      message: "Uploaded (distributed)",
      data: newAudio,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all audio
router.get("/", async (req, res) => {
  const audios = await Audio.find();
  res.json(audios);
});

// Delete audio metadata and stored copies
router.delete("/:id", async (req, res) => {
  try {
    const audio = await Audio.findById(req.params.id);
    if (!audio) return res.status(404).json({ error: "Audio not found" });

    deleteFileFromNode(audio.filename, audio.primaryNode);
    deleteFileFromNode(audio.filename, audio.replicaNode);

    await Audio.findByIdAndDelete(req.params.id);

    res.json({ message: "Audio deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;