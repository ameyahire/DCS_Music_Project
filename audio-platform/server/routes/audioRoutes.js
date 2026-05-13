const express = require("express");
const multer = require("multer");
const Audio = require("../models/Audio");
const {
  saveDistributedFile,
  deleteFileFromAllNodes,
  getNodeStatus,
} = require("../utils/storageManager");

const router = express.Router();

// store file in memory instead of disk
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Upload API
router.post("/upload", upload.single("audio"), async (req, res) => {
  try {
    const filename = Date.now() + "-" + req.file.originalname;

    const { primaryNode, replicaNode, backupNode } = saveDistributedFile(
      req.file.buffer,
      filename
    );

    const newAudio = new Audio({
      title: req.body.title,
      filename,
      primaryNode,
      replicaNode,
      backupNode,
    });

    await newAudio.save();

    res.json({
      message: "Uploaded with distributed storage",
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

    deleteFileFromAllNodes(audio.filename);
    await Audio.findByIdAndDelete(req.params.id);

    res.json({ message: "Audio deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/status", async (req, res) => {
  const status = getNodeStatus();
  res.json(status);
});

module.exports = router;