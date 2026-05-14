// ============================================
// audioRoutes.js
// ============================================

const express = require("express");

const multer = require("multer");

const {
  uploadAudio,
  getAudios,
  deleteAudio,
} = require("../controllers/audioController");

const router = express.Router();

// ============================================
// Multer Configuration
// ============================================

const storage = multer.memoryStorage();

const upload = multer({
  storage,

  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
});

// ============================================
// Routes
// ============================================

// Upload Audio
router.post(
  "/upload",
  upload.single("audio"),
  uploadAudio
);

// Get All Audios
router.get("/", getAudios);

// Delete Audio
router.delete("/:id", deleteAudio);

module.exports = router;