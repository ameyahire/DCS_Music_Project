const express = require("express");
const axios = require("axios");

const router = express.Router();

// ======================================
// Dynamic Node Configuration
// ======================================
const NODE_ID = process.env.NODE_ID || "node1";
const PORT = process.env.PORT || 5001;

// ======================================
// Cluster Nodes
// ======================================
const nodes = [
  {
    id: "node1",
    url: "http://localhost:5001",
    role: "primary",
  },
  {
    id: "node2",
    url: "http://localhost:5002",
    role: "replica",
  },
  {
    id: "node3",
    url: "http://localhost:5003",
    role: "backup",
  },
];

// ======================================
// Node Health Tracking
// ======================================
const nodeHealth = {
  node1: {
    isHealthy: true,
    failedAt: null,
  },

  node2: {
    isHealthy: true,
    failedAt: null,
  },

  node3: {
    isHealthy: true,
    failedAt: null,
  },
};

// ======================================
// Raft Variables
// ======================================
let currentTerm = 0;

let votedFor = null;

let log = [];

let commitIndex = 0;

const STATES = {
  FOLLOWER: "follower",
  CANDIDATE: "candidate",
  LEADER: "leader",
};

let currentState = STATES.FOLLOWER;

let leaderId = null;

// ======================================
// Timers
// ======================================
const HEARTBEAT_INTERVAL = 2000;

const electionTimeout = () =>
  Math.random() * 5000 + 3000;

let electionTimer = null;

let heartbeatTimer = null;

// ======================================
// Reset Election Timer
// ======================================
function resetElectionTimer() {
  if (electionTimer) {
    clearTimeout(electionTimer);
  }

  electionTimer = setTimeout(() => {
    if (currentState !== STATES.LEADER) {
      startElection();
    }
  }, electionTimeout());
}

// ======================================
// Start Election
// ======================================
async function startElection() {
  currentState = STATES.CANDIDATE;

  currentTerm++;

  votedFor = NODE_ID;

  console.log(
    `🗳️ ${NODE_ID} starting election for term ${currentTerm}`
  );

  const otherNodes = nodes.filter(
    (node) => node.id !== NODE_ID
  );

  let votes = 1;

  const results = await Promise.all(
    otherNodes.map(async (node) => {
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
            timeout: 2000,
          }
        );

        if (response.data.voteGranted) {
          console.log(
            `✅ ${node.id} voted for ${NODE_ID}`
          );
        }

        return response.data.voteGranted;
      } catch (error) {
        console.log(
          `❌ Failed to contact ${node.id}`
        );

        return false;
      }
    })
  );

  results.forEach((granted) => {
    if (granted) votes++;
  });

  console.log(
    `📊 ${NODE_ID} received ${votes} votes`
  );

  // Majority in 3-node cluster = 2
  if (votes > nodes.length / 2) {
    becomeLeader();
  } else {
    console.log(
      `❌ ${NODE_ID} failed election`
    );

    currentState = STATES.FOLLOWER;

    resetElectionTimer();
  }
}

// ======================================
// Become Leader
// ======================================
function becomeLeader() {
  currentState = STATES.LEADER;

  leaderId = NODE_ID;

  console.log(
    `👑 ${NODE_ID} became LEADER for term ${currentTerm}`
  );

  // Stop old heartbeat timer
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
  }

  // Send heartbeats periodically
  heartbeatTimer = setInterval(() => {
    sendHeartbeats();
  }, HEARTBEAT_INTERVAL);
}

// ======================================
// Send Heartbeats
// ======================================
async function sendHeartbeats() {
  if (currentState !== STATES.LEADER) return;

  const followers = nodes.filter(
    (node) => node.id !== NODE_ID
  );

  await Promise.all(
    followers.map(async (node) => {
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
            timeout: 2000,
          }
        );

        console.log(
          `💚 Heartbeat sent to ${node.id}`
        );
      } catch (error) {
        console.log(
          `❌ Heartbeat failed to ${node.id}`
        );
      }
    })
  );
}

// ======================================
// Request Vote Endpoint
// ======================================
router.post("/request-vote", (req, res) => {
  const {
    term,
    candidateId,
  } = req.body;

  // Reject lower term
  if (term < currentTerm) {
    return res.json({
      term: currentTerm,
      voteGranted: false,
    });
  }

  // Update to newer term
  if (term > currentTerm) {
    currentTerm = term;

    votedFor = null;

    currentState = STATES.FOLLOWER;
  }

  let voteGranted = false;

  if (
    votedFor === null ||
    votedFor === candidateId
  ) {
    voteGranted = true;

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

// ======================================
// Append Entries / Heartbeats
// ======================================
router.post("/append-entries", (req, res) => {
  const {
    term,
    leaderId: incomingLeader,
    leaderCommit,
  } = req.body;

  // Reject outdated leader
  if (term < currentTerm) {
    return res.json({
      term: currentTerm,
      success: false,
    });
  }

  // Accept newer term
  currentTerm = term;

  leaderId = incomingLeader;

  currentState = STATES.FOLLOWER;

  resetElectionTimer();

  if (leaderCommit > commitIndex) {
    commitIndex = Math.min(
      leaderCommit,
      log.length - 1
    );
  }

  console.log(
    `💚 ${NODE_ID} received heartbeat from ${incomingLeader}`
  );

  res.json({
    term: currentTerm,
    success: true,
  });
});

// ======================================
// Cluster Status
// ======================================
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

// ======================================
// Simulate Node Failure
// ======================================
router.post(
  "/simulate-failure/:nodeId",
  (req, res) => {
    const { nodeId } = req.params;

    if (!nodeHealth[nodeId]) {
      return res.status(400).json({
        error: "Invalid node ID",
      });
    }

    nodeHealth[nodeId].isHealthy = false;

    nodeHealth[nodeId].failedAt =
      new Date().toISOString();

    console.log(`🔴 ${nodeId} FAILED`);

    res.json({
      message: `${nodeId} failure simulated`,
      nodeHealth,
    });
  }
);

// ======================================
// Recover Node
// ======================================
router.post(
  "/recover-node/:nodeId",
  (req, res) => {
    const { nodeId } = req.params;

    if (!nodeHealth[nodeId]) {
      return res.status(400).json({
        error: "Invalid node ID",
      });
    }

    nodeHealth[nodeId].isHealthy = true;

    nodeHealth[nodeId].failedAt = null;

    console.log(`🟢 ${nodeId} RECOVERED`);

    res.json({
      message: `${nodeId} recovered`,
      nodeHealth,
    });
  }
);

// ======================================
// Get Node Health
// ======================================
router.get("/node-health", (req, res) => {
  const summary = {};

  Object.entries(nodeHealth).forEach(
    ([nodeId, health]) => {
            summary[nodeId] = {
        isHealthy: health.isHealthy,
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

// ======================================
// Check Single Node Health
// ======================================
router.get(
  "/is-node-healthy/:nodeId",
  (req, res) => {
    const { nodeId } = req.params;

    res.json({
      nodeId,
      isHealthy:
        nodeHealth[nodeId]?.isHealthy ??
        false,
    });
  }
);

// ======================================
// Root Test Route
// ======================================
router.get("/", (req, res) => {
  res.json({
    message: `${NODE_ID} consensus service running`,
  });
});

// ======================================
// Start Election Timer
// ======================================
resetElectionTimer();

module.exports = router;