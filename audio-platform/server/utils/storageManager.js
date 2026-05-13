const fs = require("fs");
const path = require("path");

const nodes = ["node1", "node2", "node3"];
let currentIndex = 0;

// Round-robin node selection
function getNextNode() {
  const node = nodes[currentIndex];
  currentIndex = (currentIndex + 1) % nodes.length;
  return node;
}

// Save file to node
function saveFileToNode(fileBuffer, filename, node) {
  const filePath = path.join(__dirname, "../storage_nodes", node, filename);
  fs.writeFileSync(filePath, fileBuffer);
  return filePath;
}

// Replication (store in 2 nodes)
function replicateFile(fileBuffer, filename, primaryNode) {
  const secondaryNode =
    nodes[(nodes.indexOf(primaryNode) + 1) % nodes.length];

  saveFileToNode(fileBuffer, filename, secondaryNode);

  return secondaryNode;
}

function deleteFileFromNode(filename, node) {
  if (!node) return;

  const filePath = path.join(__dirname, "../storage_nodes", node, filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

module.exports = {
  getNextNode,
  saveFileToNode,
  replicateFile,
  deleteFileFromNode,
};