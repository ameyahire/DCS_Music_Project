const express = require("express");
const fs = require("fs");
const path = require("path");
const Audio = require("../models/Audio");

const router = express.Router();

router.get("/:filename", async (req, res) => {
  try {
    const audio = await Audio.findOne({
      filename: req.params.filename,
    });

    if (!audio) return res.status(404).send("File not found");

    let filePath = path.join(
      __dirname,
      "../storage_nodes",
      audio.primaryNode,
      audio.filename
    );

    // If primary node fails → use replica
    if (!fs.existsSync(filePath)) {
      console.log("Primary failed, using replica...");

      filePath = path.join(
        __dirname,
        "../storage_nodes",
        audio.replicaNode,
        audio.filename
      );

      if (!fs.existsSync(filePath)) {
        return res.status(500).send("File unavailable");
      }
    }

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