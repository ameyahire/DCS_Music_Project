// ============================================
// consensusRoutes.js
// Dynamic Raft Consensus Simulation
// ============================================

const express = require("express");
const axios = require("axios");

const router = express.Router();

// ============================================
// Node Configuration
// ============================================

const NODE_ID =
  process.env.NODE_ID || "node1";

const PORT =
  process.env.PORT || 5001;

// ============================================
// Cluster Nodes
// ============================================

const nodes = [
  {
    id: "node1",
    url: "http://localhost:5001",
  },
  {
    id: "node2",
    url: "http://localhost:5002",
  },
  {
    id: "node3",
    url: "http://localhost:5003",
  },
];

// ============================================
// States
// ============================================

const STATES = {
  FOLLOWER: "follower",

  CANDIDATE: "candidate",

  LEADER: "leader",
};

// ============================================
// Raft Variables
// ============================================

let currentState = STATES.FOLLOWER;

let currentTerm = 0;

let votedFor = null;

let leaderId = null;

let electionTimer = null;

let heartbeatTimer = null;

let log = [];

let commitIndex = 0;

// ============================================
// Node Health Tracking
// ============================================

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

// ============================================
// Random Election Timeout
// ============================================

const electionTimeout = () =>
  Math.floor(Math.random() * 4000) +
  3000;

// ============================================
// Reset Election Timer
// ============================================

function resetElectionTimer() {
  clearTimeout(electionTimer);

  electionTimer = setTimeout(() => {
    if (
      currentState !== STATES.LEADER &&
      nodeHealth[NODE_ID]?.isHealthy
    ) {
      startElection();
    }
  }, electionTimeout());
}

// ============================================
// Start Election
// ============================================

async function startElection() {
  if (!nodeHealth[NODE_ID]?.isHealthy) {
    return;
  }

  currentState = STATES.CANDIDATE;

  currentTerm++;

  votedFor = NODE_ID;

  let votes = 1;

  console.log(
    `🗳️ ${NODE_ID} starting election for term ${currentTerm}`
  );

  const otherNodes = nodes.filter(
    (node) =>
      node.id !== NODE_ID &&
      nodeHealth[node.id]?.isHealthy
  );

  await Promise.all(
    otherNodes.map(async (node) => {
      try {
        const response =
          await axios.post(
            `${node.url}/api/consensus/request-vote`,
            {
              term: currentTerm,

              candidateId: NODE_ID,
            },
            {
              timeout: 2000,
            }
          );

        if (
          response.data.voteGranted
        ) {
          votes++;

          console.log(
            `✅ ${node.id} voted for ${NODE_ID}`
          );
        }
      } catch (error) {
        console.log(
          `❌ Failed to contact ${node.id}`
        );
      }
    })
  );

  console.log(
    `📊 ${NODE_ID} received ${votes} votes`
  );

  // ============================================
  // Majority Logic
  // ============================================

  const majority =
    Math.floor(nodes.length / 2) + 1;

  if (votes >= majority) {
    becomeLeader();
  } else {
    console.log(
      `❌ ${NODE_ID} failed election`
    );

    currentState =
      STATES.FOLLOWER;

    resetElectionTimer();
  }
}

// ============================================
// Become Leader
// ============================================

function becomeLeader() {
  currentState = STATES.LEADER;

  leaderId = NODE_ID;

  clearInterval(heartbeatTimer);

  console.log(`
=================================
👑 NEW LEADER ELECTED
Node: ${NODE_ID}
Term: ${currentTerm}
=================================
`);

  heartbeatTimer = setInterval(
    sendHeartbeats,
    2000
  );
}

// ============================================
// Send Heartbeats
// ============================================

async function sendHeartbeats() {
  if (
    currentState !== STATES.LEADER
  ) {
    return;
  }

  if (
    !nodeHealth[NODE_ID]
      ?.isHealthy
  ) {
    return;
  }

  const followers = nodes.filter(
    (node) =>
      node.id !== NODE_ID &&
      nodeHealth[node.id]?.isHealthy
  );

  await Promise.all(
    followers.map(async (node) => {
      try {
        await axios.post(
          `${node.url}/api/consensus/append-entries`,
          {
            term: currentTerm,

            leaderId: NODE_ID,

            leaderCommit:
              commitIndex,
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

// ============================================
// Request Vote
// ============================================

router.post(
  "/request-vote",
  (req, res) => {
    if (
      !nodeHealth[NODE_ID]
        ?.isHealthy
    ) {
      return res.status(503).json({
        error: "Node is down",
      });
    }

    const {
      term,
      candidateId,
    } = req.body;

    if (term < currentTerm) {
      return res.json({
        term: currentTerm,

        voteGranted: false,
      });
    }

    if (term > currentTerm) {
      currentTerm = term;

      votedFor = null;

      currentState =
        STATES.FOLLOWER;
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
  }
);

// ============================================
// Append Entries / Heartbeat
// ============================================

router.post(
  "/append-entries",
  (req, res) => {
    if (
      !nodeHealth[NODE_ID]
        ?.isHealthy
    ) {
      return res.status(503).json({
        error: "Node is down",
      });
    }

    const {
      term,
      leaderId: incomingLeader,
    } = req.body;

    if (term < currentTerm) {
      return res.json({
        success: false,
      });
    }

    currentTerm = term;

    // Prevent split brain
    if (
      currentState ===
      STATES.CANDIDATE
    ) {
      currentState =
        STATES.FOLLOWER;
    }

    leaderId = incomingLeader;

    votedFor = null;

    resetElectionTimer();

    console.log(
      `💚 ${NODE_ID} received heartbeat from ${incomingLeader}`
    );

    res.json({
      success: true,
    });
  }
);

// ============================================
// Simulate Failure
// ============================================

router.post(
  "/simulate-failure/:nodeId",
  async (req, res) => {
    const { nodeId } = req.params;

    const targetNode = nodes.find(
      (n) => n.id === nodeId
    );

    if (!targetNode) {
      return res.status(400).json({
        error: "Invalid node ID",
      });
    }

    try {
      await axios.post(
        `${targetNode.url}/api/consensus/internal-fail`
      );

      res.json({
        success: true,

        message: `${nodeId} failure simulated`,
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error:
          "Failed to simulate node failure",
      });
    }
  }
);

// ============================================
// Internal Fail
// ============================================

router.post(
  "/internal-fail",
  (req, res) => {
    nodeHealth[NODE_ID].isHealthy =
      false;

    nodeHealth[NODE_ID].failedAt =
      new Date().toISOString();

    console.log(`
=================================
🔴 ${NODE_ID} FAILED
=================================
`);

    clearInterval(heartbeatTimer);

    heartbeatTimer = null;

    if (leaderId === NODE_ID) {
      console.log(`
=================================
👑 LEADER ${NODE_ID} FAILED
⚠️ Starting re-election process
=================================
`);
    }

    currentState =
      STATES.FOLLOWER;

    leaderId = null;

    votedFor = null;

    clearTimeout(electionTimer);

    res.json({
      success: true,

      node: NODE_ID,
    });
  }
);

// ============================================
// Recover Node
// ============================================

router.post(
  "/recover-node/:nodeId",
  async (req, res) => {
    const { nodeId } = req.params;

    const targetNode = nodes.find(
      (n) => n.id === nodeId
    );

    if (!targetNode) {
      return res.status(400).json({
        error: "Invalid node ID",
      });
    }

    try {
      await axios.post(
        `${targetNode.url}/api/consensus/internal-recover`
      );

      res.json({
        success: true,

        message: `${nodeId} recovered`,
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error:
          "Failed to recover node",
      });
    }
  }
);

// ============================================
// Internal Recover
// ============================================

router.post(
  "/internal-recover",
  (req, res) => {
    nodeHealth[NODE_ID].isHealthy =
      true;

    nodeHealth[NODE_ID].failedAt =
      null;

    currentState =
      STATES.FOLLOWER;

    leaderId = null;

    votedFor = null;

    console.log(`
=================================
🟢 ${NODE_ID} RECOVERED
=================================
`);

    resetElectionTimer();

    res.json({
      success: true,

      node: NODE_ID,
    });
  }
);

// ============================================
// Cluster Status
// ============================================

router.get("/status", (req, res) => {
  res.json({
    nodeId: NODE_ID,

    port: PORT,

    state: currentState,

    isLeader:
      currentState ===
      STATES.LEADER,

    term: currentTerm,

    leader: leaderId,

    logLength: log.length,

    commitIndex,

    nodeHealth,
  });
});

// ============================================
// Start Election Timer
// ============================================

resetElectionTimer();

// ============================================
// Export Router
// ============================================

module.exports = router;