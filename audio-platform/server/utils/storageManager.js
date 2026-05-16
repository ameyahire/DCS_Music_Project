const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

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
// Storage Node Configuration
// ============================================
const STORAGE_NODES = [
  {
    id: "node1",
    role: "primary",
    path: path.join(__dirname, "../storage_nodes/node1"),
  },
  {
    id: "node2",
    role: "replica",
    path: path.join(__dirname, "../storage_nodes/node2"),
  },
  {
    id: "node3",
    role: "backup",
    path: path.join(__dirname, "../storage_nodes/node3"),
  },
];

// ============================================
// Ensure Storage Directories Exist
// ============================================
function initializeStorageNodes() {
  STORAGE_NODES.forEach((node) => {
    if (!fs.existsSync(node.path)) {
      fs.mkdirSync(node.path, { recursive: true });
      console.log(`📁 Created storage node: ${node.id}`);
    }
  });
}

initializeStorageNodes();

// ============================================
// Generate Unique File ID
// ============================================
function generateFileId(filename) {
  const timestamp = Date.now();
  const random = crypto.randomBytes(6).toString("hex");

  return `${timestamp}-${random}-${filename}`;
}

// ============================================
// Consistent Hashing
// ============================================
function getNodeByHash(fileId) {
  const hash = crypto
    .createHash("md5")
    .update(fileId)
    .digest("hex");

  const numericHash = parseInt(hash.substring(0, 8), 16);

  const index = numericHash % STORAGE_NODES.length;

  return STORAGE_NODES[index];
}

// ============================================
// Save File To Distributed Storage
// ============================================
async function storeFile(file) {
  try {
    const fileId = generateFileId(file.originalname);

    // Select primary node using hashing
    const primaryNode = getNodeByHash(fileId);

    const primaryPath = path.join(
      primaryNode.path,
      fileId
    );

    // Save primary file
    fs.writeFileSync(primaryPath, file.buffer);

    console.log(
      `✅ File stored in ${primaryNode.id}`
    );

    // ============================================
    // Replication
    // ============================================
    const replicas = STORAGE_NODES.filter(
      (node) => node.id !== primaryNode.id
    );

    replicas.forEach((replicaNode) => {
      const replicaPath = path.join(
        replicaNode.path,
        fileId
      );

      fs.writeFileSync(replicaPath, file.buffer);

      console.log(
        `📦 Replicated to ${replicaNode.id}`
      );
    });

    return {
      success: true,
      fileId,
      primaryNode: primaryNode.id,
      replicas: replicas.map((r) => r.id),
      storagePath: primaryPath,
    };
  } catch (error) {
    console.error("❌ Storage Error:", error);

    return {
      success: false,
      error: error.message,
    };
  }
}

// ============================================
// Get File Path
// ============================================
function getFilePath(fileId) {
  for (const node of STORAGE_NODES) {
    const filePath = path.join(node.path, fileId);

    if (fs.existsSync(filePath)) {
      return {
        exists: true,
        node: node.id,
        path: filePath,
      };
    }
  }

  return {
    exists: false,
  };
}

// ============================================
// Stream File
// ============================================

async function streamFile(fileId, res) {
  try {
    const fileInfo = getFilePath(fileId);

    // ============================================
    // File Exists Check
    // ============================================

    if (!fileInfo.exists) {
      return res.status(404).json({
        error: "File not found",
      });
    }

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

    // Count Healthy Nodes
    const healthyNodes =
      responses.filter(
        (res) =>
          res.status ===
            "fulfilled" &&
          res.value.data
            .isHealthy
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

    // ============================================
    // File Stats
    // ============================================

    const stat = fs.statSync(
      fileInfo.path
    );

    const fileSize = stat.size;

    const range =
      res.req.headers.range;

    // ============================================
    // HTTP Range Streaming
    // ============================================

    if (range) {
      const parts = range
        .replace(/bytes=/, "")
        .split("-");

      const start = parseInt(
        parts[0],
        10
      );

      const end = parts[1]
        ? parseInt(parts[1], 10)
        : fileSize - 1;

      const chunkSize =
        end - start + 1;

      const stream =
        fs.createReadStream(
          fileInfo.path,
          {
            start,
            end,
          }
        );

      const headers = {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,

        "Accept-Ranges":
          "bytes",

        "Content-Length":
          chunkSize,

        "Content-Type":
          "audio/mpeg",
      };

      res.writeHead(206, headers);

      stream.pipe(res);
    } else {
      // ============================================
      // Full File Streaming
      // ============================================

      const headers = {
        "Content-Length":
          fileSize,

        "Content-Type":
          "audio/mpeg",
      };

      res.writeHead(200, headers);

      fs.createReadStream(
        fileInfo.path
      ).pipe(res);
    }
  } catch (error) {
    console.error(`
=================================
STREAM ERROR
=================================
`);

    console.error(error);

    return res.status(500).json({
      success: false,

      error:
        error.message ||
        "Streaming failed",
    });
  }
}

// ============================================
// Download File
// ============================================
function downloadFile(fileId, res) {
  const fileInfo = getFilePath(fileId);

  if (!fileInfo.exists) {
    return res.status(404).json({
      error: "File not found",
    });
  }

  res.download(fileInfo.path);
}

// ============================================
// Delete File
// ============================================
function deleteFile(fileId) {
  try {
    STORAGE_NODES.forEach((node) => {
      const filePath = path.join(node.path, fileId);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);

        console.log(
          `🗑️ Deleted from ${node.id}`
        );
      }
    });

    return {
      success: true,
      message: "File deleted successfully",
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

// ============================================
// Get Storage Statistics
// ============================================
function getStorageStats() {
  const stats = STORAGE_NODES.map((node) => {
    const files = fs.readdirSync(node.path);

    let totalSize = 0;

    files.forEach((file) => {
      const filePath = path.join(node.path, file);

      const stat = fs.statSync(filePath);

      totalSize += stat.size;
    });

    return {
      nodeId: node.id,
      role: node.role,
      totalFiles: files.length,
      totalSizeMB: (
        totalSize /
        (1024 * 1024)
      ).toFixed(2),
    };
  });

  return stats;
}

// ============================================
// Export Functions
// ============================================
module.exports = {
  STORAGE_NODES,
  initializeStorageNodes,
  generateFileId,
  getNodeByHash,
  storeFile,
  getFilePath,
  streamFile,
  downloadFile,
  deleteFile,
  getStorageStats,
};
