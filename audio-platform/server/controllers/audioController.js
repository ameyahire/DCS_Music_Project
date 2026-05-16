const Audio = require("../models/Audio");

const storageManager = require("../utils/storageManager");

const {
  nodeHealth,
  nodes,
} = require("../routes/consensusRoutes");

const {
  storeFile,
} = require("../utils/storageManager");

const axios = require("axios");

// ============================================
// Cluster Nodes
// ============================================

const clusterNodes = [
  "http://localhost:5001",
  "http://localhost:5002",
  "http://localhost:5003",
];



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
      req.file?.originalname
    );

    // ============================================
    // Validate Request
    // ============================================

    if (!req.file) {
      return res.status(400).json({
        success: false,

        error:
          "No audio file uploaded",
      });
    }

    if (!req.body.title) {
      return res.status(400).json({
        success: false,

        error:
          "Audio title is required",
      });
    }

    // ============================================
    // REAL CLUSTER QUORUM CHECK
    // ============================================

    const responses =
      await Promise.allSettled(
        clusterNodes.map((url) =>
          axios.get(
            `${url}/api/consensus/status`,
            {
              timeout: 1500,
            }
          )
        )
      );

    // Count active nodes
    const healthyNodes =
      responses.filter(
      (res) =>
        res.status === "fulfilled" &&
        res.value.data.isHealthy
    ).length;

    const majority =
      Math.floor(
        clusterNodes.length / 2
      ) + 1;

    console.log(`
=================================
RAFT QUORUM CHECK
Healthy Nodes: ${healthyNodes}
Required Majority: ${majority}
=================================
`);

    // ============================================
    // Block Upload If Quorum Lost
    // ============================================

    if (healthyNodes < majority) {
      console.log(`
=================================
❌ QUORUM LOST
Upload Blocked
=================================
`);

      return res.status(503).json({
        success: false,

        error:
          "Cluster quorum unavailable. Upload blocked.",

        raft: {
          healthyNodes,

          requiredMajority:
            majority,
        },
      });
    }

    // ============================================
    // Store File
    // ============================================

    const storageResult =
      await storeFile(req.file);

    console.log(
      "STORAGE RESULT:",
      storageResult
    );

    if (!storageResult.success) {
      return res.status(500).json({
        success: false,

        error:
          "Failed to store audio file",
      });
    }

    // ============================================
    // Save Metadata In MongoDB
    // ============================================

    const audio =
      await Audio.create({
        title: req.body.title,

        filename:
          storageResult.fileId,

        primaryNode:
          storageResult.primaryNode,

        replicaNode:
          storageResult.replicas?.[0] ||
          null,

        backupNode:
          storageResult.replicas?.[1] ||
          null,
      });

    console.log(`
========== UPLOAD SUCCESS ==========
`);

    // ============================================
    // Success Response
    // ============================================

    res.status(201).json({
      success: true,

      message:
        "Audio uploaded successfully",

      audio,
    });
  } catch (error) {
    console.error(`
========== UPLOAD ERROR ==========
`);

    console.error(error);

    res.status(500).json({
      success: false,

      error:
        error.message ||
        "Upload failed",
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