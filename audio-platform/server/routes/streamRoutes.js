const express = require("express");
const fs = require("fs");
const path = require("path");
const Audio = require("../models/Audio");

const router = express.Router();

const axios = require("axios");

// ============================================
// Cluster Nodes
// ============================================

const clusterNodes = [
  "http://localhost:5001",
  "http://localhost:5002",
  "http://localhost:5003",
];

router.get("/:filename", async (req, res) => {

// ============================================
// Check Cluster Availability
// ============================================

const responses =
  await Promise.allSettled(
    clusterNodes.map((url) =>
      axios.get(
        `${url}/api/consensus/status`,
        {
          timeout: 1000,
        }
      )
    )
  );

const healthyNodes =
  responses.filter(
    (res) =>
      res.status === "fulfilled" &&
      res.value.data.isHealthy
  ).length;

console.log(`
=================================
STREAM CHECK
Healthy Nodes: ${healthyNodes}
=================================
`);

// ============================================
// Block Streaming If ALL Nodes Dead
// ============================================

if (healthyNodes === 0) {
  return res.status(503).json({
    success: false,

    error:
      "All storage nodes unavailable. Streaming failed.",
  });
}

  
  try {
    const audio = await Audio.findOne({
      filename: req.params.filename,
    });

    if (!audio) return res.status(404).send("File not found");

    const candidates = [
      audio.primaryNode,
      audio.replicaNode,
      audio.backupNode,
    ].filter(Boolean);

    let filePath = null;
    let currentNode = null;

    for (const nodeName of candidates) {
      const candidatePath = path.join(
        __dirname,
        "../storage_nodes",
        nodeName,
        audio.filename
      );
      if (fs.existsSync(candidatePath)) {
        filePath = candidatePath;
        currentNode = nodeName;
        break;
      }
    }

    if (!filePath) {
      return res.status(500).send("File unavailable");
    }

    console.log(`Streaming from ${currentNode}`);

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;

    const range = req.headers.range;

    if (!range) {
      return res.status(400).send("Requires Range header");
    }

    const CHUNK_SIZE = 10 ** 6;
    const start = Number(range.replace(/\D/g, ""));
    const end = Math.min(start + CHUNK_SIZE, fileSize - 1);

    const headers = {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": end - start + 1,
      "Content-Type": "audio/mpeg",
    };

    res.writeHead(206, headers);
    fs.createReadStream(filePath, { start, end }).pipe(res);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

module.exports = router;