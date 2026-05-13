const express = require("express");
const axios = require("axios");

const router = express.Router();

// ===============================
// Dynamic Node Config
// ===============================
const NODE_ID = process.env.NODE_ID || "node1";
const PORT = process.env.PORT || 5001;

// ===============================
// Cluster Nodes
// ===============================
const nodes = [
  { id: "node1", url: "http://localhost:5001", role: "primary" },
  { id: "node2", url: "http://localhost:5002", role: "replica" },
  { id: "node3", url: "http://localhost:5003", role: "backup" },
];

// ===============================
// Node Health
// ===============================
const nodeHealth = {
  node1: { isHealthy: true, failedAt: null },
  node2: { isHealthy: true, failedAt: null },
  node3: { isHealthy: true, failedAt: null },
};

// ===============================
// Raft State Variables
// ===============================
let currentTerm = 0;
let votedFor = null;
let log = [];
let commitIndex = 0;
let lastApplied = 0;

const STATES = {
  FOLLOWER: "follower",
  CANDIDATE: "candidate",
  LEADER: "leader",
};

let currentState = STATES.FOLLOWER;
let leaderId = null;

// ===============================
// Timers
// ===============================
const HEARTBEAT_INTERVAL = 200;

const electionTimeout = () => Math.random() * 1500 + 1500;

let electionTimer = null;
let heartbeatTimer = null;

// ===============================
// Reset Election Timer
// ===============================
function resetElectionTimer() {
  if (electionTimer) {
    clearTimeout(electionTimer);
  }

  electionTimer = setTimeout(() => {
    startElection();
  }, electionTimeout());
}

// ===============================
// Start Election
// ===============================
async function startElection() {
  currentState = STATES.CANDIDATE;
  currentTerm++;

  votedFor = NODE_ID;

  let votes = 1;

  console.log(
    `🗳️ ${NODE_ID} starting election for term ${currentTerm}`
  );

  const otherNodes = nodes.filter((n) => n.id !== NODE_ID);

  const voteRequests = otherNodes.map(async (node) => {
    try {
      const response = await axios.post(
        `${node.url}/api/consensus/request-vote`,
        {
          term: currentTerm,
          candidateId: NODE_ID,
          lastLogIndex: log.length - 1,
          lastLogTerm:
            log.length > 0
              ? log[log.length - 1].term
              : 0,
        },
        {
          timeout: 1000,
        }
      );

      if (response.data.voteGranted) {
        votes++;
        console.log(`✅ Vote received from ${node.id}`);
      }
    } catch (error) {
      console.log(`❌ Failed to contact ${node.id}`);
    }
  });

  await Promise.all(voteRequests);

  // Majority check
  if (votes > nodes.length / 2) {
    becomeLeader();
  } else {
    console.log(
      `❌ ${NODE_ID} failed election with ${votes} votes`
    );

    currentState = STATES.FOLLOWER;

    resetElectionTimer();
  }
}

// ===============================
// Become Leader
// ===============================
function becomeLeader() {
  currentState = STATES.LEADER;

  leaderId = NODE_ID;

  console.log(
    `👑 ${NODE_ID} became LEADER for term ${currentTerm}`
  );

  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
  }

  heartbeatTimer = setInterval(() => {
    sendHeartbeats();
  }, HEARTBEAT_INTERVAL);
}

// ===============================
// Send Heartbeats
// ===============================
async function sendHeartbeats() {
  if (currentState !== STATES.LEADER) return;

  const otherNodes = nodes.filter((n) => n.id !== NODE_ID);

  const heartbeatRequests = otherNodes.map(async (node) => {
    try {
      await axios.post(
        `${node.url}/api/consensus/append-entries`,
        {
          term: currentTerm,
          leaderId: NODE_ID,
          prevLogIndex: log.length - 1,
          prevLogTerm:
            log.length > 0
              ? log[log.length - 1].term
              : 0,
          entries: [],
          leaderCommit: commitIndex,
        },
        {
          timeout: 1000,
        }
      );

      console.log(`💓 Heartbeat sent to ${node.id}`);
    } catch (error) {
      console.log(`❌ Heartbeat failed to ${node.id}`);
    }
  });

  await Promise.all(heartbeatRequests);
}

// ===============================
// Request Vote Endpoint
// ===============================
router.post("/request-vote", (req, res) => {
  const {
    term,
    candidateId,
    lastLogIndex,
    lastLogTerm,
  } = req.body;

  if (term > currentTerm) {
    currentTerm = term;
    votedFor = null;
    currentState = STATES.FOLLOWER;
  }

  const voteGranted =
    term >= currentTerm &&
    (votedFor === null || votedFor === candidateId);

  if (voteGranted) {
    votedFor = candidateId;

    resetElectionTimer();

    console.log(
      `🗳️ ${NODE_ID} voted for ${candidateId}`
    );
  }

  res.json({
    term: currentTerm,
    voteGranted,
  });
});

// ===============================
// Append Entries / Heartbeat
// ===============================
router.post("/append-entries", (req, res) => {
  const {
    term,
    leaderId: newLeaderId,
    leaderCommit,
  } = req.body;

  if (term >= currentTerm) {
    currentTerm = term;
    leaderId = newLeaderId;

    currentState = STATES.FOLLOWER;

    resetElectionTimer();
  }

  if (leaderCommit > commitIndex) {
    commitIndex = Math.min(
      leaderCommit,
      log.length - 1
    );
  }

  res.json({
    term: currentTerm,
    success: true,
  });
});

// ===============================
// Cluster Status
// ===============================
router.get("/status", (req, res) => {
  res.json({
    nodeId: NODE_ID,
    port: PORT,
    state: currentState,
    term: currentTerm,
    leader: leaderId,
    logLength: log.length,
    commitIndex,
    nodeHealth,
  });
});

// ===============================
// Simulate Node Failure
// ===============================
router.post("/simulate-failure/:nodeId", (req, res) => {
  const { nodeId } = req.params;

  if (!nodeHealth[nodeId]) {
    return res.status(400).json({
      error: "Invalid node ID",
    });
  }

  if (nodeId === NODE_ID) {
    return res.status(400).json({
      error: "Cannot fail current node",
    });
  }

  nodeHealth[nodeId].isHealthy = false;
  nodeHealth[nodeId].failedAt =
    new Date().toISOString();

  console.log(
    `🔴 Node ${nodeId} FAILED`
  );

  res.json({
    message: `Node ${nodeId} failed`,
    nodeHealth,
  });
});

// ===============================
// Recover Node
// ===============================
router.post("/recover-node/:nodeId", (req, res) => {
  const { nodeId } = req.params;

  if (!nodeHealth[nodeId]) {
    return res.status(400).json({
      error: "Invalid node ID",
    });
  }

  nodeHealth[nodeId].isHealthy = true;
  nodeHealth[nodeId].failedAt = null;

  console.log(
    `🟢 Node ${nodeId} RECOVERED`
  );

  res.json({
    message: `Node ${nodeId} recovered`,
    nodeHealth,
  });
});

// ===============================
// Node Health Endpoint
// ===============================
router.get("/node-health", (req, res) => {
  const summary = {};

  Object.entries(nodeHealth).forEach(
    ([nodeId, health]) => {
      summary[nodeId] = {
        status: health.isHealthy
          ? "healthy"
          : "failed",
        failedAt: health.failedAt,
        nodeInfo: nodes.find(
          (n) => n.id === nodeId
        ),
      };
    }
  );

  res.json(summary);
});

// ===============================
// Check Specific Node Health
// ===============================
router.get(
  "/is-node-healthy/:nodeId",
  (req, res) => {
    const { nodeId } = req.params;

    const isHealthy =
      nodeHealth[nodeId]?.isHealthy ?? true;

    res.json({
      nodeId,
      isHealthy,
    });
  }
);

// ===============================
// Start Initial Election Timer
// ===============================
resetElectionTimer();

module.exports = router;