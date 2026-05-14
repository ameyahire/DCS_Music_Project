const Audio = require("../models/Audio");

const storageManager = require("../utils/storageManager");

// ============================================
// Upload Audio
// ============================================

const uploadAudio = async (req, res) => {
  try {
    console.log(
      "========== UPLOAD START =========="
    );

    console.log("BODY:", req.body);

    console.log(
      "FILE:",
      req.file
        ? req.file.originalname
        : "NO FILE"
    );

    // ============================================
    // Validation
    // ============================================

    if (!req.file) {
      return res.status(400).json({
        error: "No audio file uploaded",
      });
    }

    if (!req.body.title) {
      return res.status(400).json({
        error: "Title is required",
      });
    }

    // ============================================
    // Store File
    // ============================================

    const storageResult =
      await storageManager.storeFile(
        req.file
      );

    console.log(
      "STORAGE RESULT:",
      storageResult
    );

    if (!storageResult.success) {
      return res.status(500).json({
        error: storageResult.error,
      });
    }

    // ============================================
    // Save Metadata
    // ============================================

    const audio = new Audio({
      title: req.body.title,

      filename: storageResult.fileId,

      primaryNode:
        storageResult.primaryNode,

      replicaNode:
        storageResult.replicas[0],

      backupNode:
        storageResult.replicas[1],
    });

    await audio.save();

    console.log(
      "========== UPLOAD SUCCESS =========="
    );

    res.status(201).json({
      success: true,

      message:
        "Audio uploaded successfully",

      audio,
    });
  } catch (error) {
    console.error(
      "========== UPLOAD ERROR =========="
    );

    console.error(error);

    res.status(500).json({
      error: error.message,
    });
  }
};

// ============================================
// Get All Audios
// ============================================

const getAudios = async (req, res) => {
  try {
    const audios = await Audio.find().sort({
      createdAt: -1,
    });

    res.json(audios);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: error.message,
    });
  }
};

// ============================================
// Delete Audio
// ============================================

const deleteAudio = async (req, res) => {
  try {
    const audio = await Audio.findById(
      req.params.id
    );

    if (!audio) {
      return res.status(404).json({
        error: "Audio not found",
      });
    }

    // Delete from storage
    storageManager.deleteFile(
      audio.filename
    );

    // Delete metadata
    await Audio.findByIdAndDelete(
      req.params.id
    );

    res.json({
      success: true,

      message:
        "Audio deleted successfully",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: error.message,
    });
  }
};

module.exports = {
  uploadAudio,
  getAudios,
  deleteAudio,
};