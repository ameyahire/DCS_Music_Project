// ============================================
// Consensus.jsx
// FULL SAFE VERSION
// ============================================

import { useEffect, useState } from "react";

import axios from "axios";

import "./Consensus.css";

function Consensus() {
  const [nodes, setNodes] = useState([]);

  const BASE_URLS = [
    "http://localhost:5001",
    "http://localhost:5002",
    "http://localhost:5003",
  ];

  // ============================================
  // Fetch Cluster Status
  // ============================================

  const fetchStatus = async () => {
    try {
      const responses =
        await Promise.allSettled(
          BASE_URLS.map((url) =>
            axios.get(
              `${url}/api/consensus/status`
            )
          )
        );

      const clusterData =
        responses.map(
          (response, index) => {
            // ============================================
            // Node Online
            // ============================================

            if (
              response.status ===
              "fulfilled"
            ) {
              return {
                ...response.value.data,

                online: true,
              };
            }

            // ============================================
            // Node Offline
            // ============================================

            return {
              nodeId: `node${
                index + 1
              }`,

              port: `${
                5001 + index
              }`,

              state: "offline",

              isLeader: false,

              term: 0,

              leader: null,

              logLength: 0,

              commitIndex: 0,

              online: false,

              nodeHealth: {},
            };
          }
        );

      setNodes(clusterData);
    } catch (error) {
      console.error(error);
    }
  };

  // ============================================
  // Simulate Failure
  // ============================================

  const failNode = async (
    nodeId
  ) => {
    try {
      await axios.post(
        `http://localhost:5001/api/consensus/simulate-failure/${nodeId}`
      );

      alert(
        `${nodeId} failure simulated`
      );

      fetchStatus();
    } catch (error) {
      console.error(error);

      alert(
        "Failed to simulate node failure"
      );
    }
  };

  // ============================================
  // Recover Node
  // ============================================

  const recoverNode = async (
    nodeId
  ) => {
    try {
      await axios.post(
        `http://localhost:5001/api/consensus/recover-node/${nodeId}`
      );

      alert(`${nodeId} recovered`);

      fetchStatus();
    } catch (error) {
      console.error(error);

      alert(
        "Failed to recover node"
      );
    }
  };

  // ============================================
  // Initial Fetch
  // ============================================

  useEffect(() => {
    fetchStatus();

    const interval = setInterval(
      fetchStatus,
      3000
    );

    return () =>
      clearInterval(interval);
  }, []);

  // ============================================
  // UI
  // ============================================

  return (
    <div className="consensus-page">
      <h1 className="consensus-title">
        Distributed Cluster Status
      </h1>

      <div className="node-grid">
        {nodes.map((node) => {
          // ============================================
          // Safe Health Access
          // ============================================

          const health =
            node?.nodeHealth?.[
              node.nodeId
            ];

          const isHealthy =
            health?.isHealthy ??
            node.online;

          return (
            <div
              key={node.nodeId}
              className={`node-card ${
                isHealthy
                  ? "healthy"
                  : "failed"
              }`}
            >
              {/* ============================================
                  Node Header
              ============================================ */}

              <div className="node-header">
                <h2>
                  {node.nodeId}
                </h2>

                {node.isLeader && (
                  <span className="leader-badge">
                    👑 Leader
                  </span>
                )}
              </div>

              {/* ============================================
                  Status
              ============================================ */}

              <p>
                <strong>
                  Status:
                </strong>{" "}
                {isHealthy
                  ? "🟢 Healthy"
                  : "🔴 Failed"}
              </p>

              <p>
                <strong>
                  State:
                </strong>{" "}
                {node.state}
              </p>

              <p>
                <strong>
                  Term:
                </strong>{" "}
                {node.term}
              </p>

              <p>
                <strong>
                  Current Leader:
                </strong>{" "}
                {node.leader ||
                  "None"}
              </p>

              <p>
                <strong>
                  Port:
                </strong>{" "}
                {node.port}
              </p>

              {/* ============================================
                  Buttons
              ============================================ */}

              <div className="button-group">
                {isHealthy ? (
                  <button
                    className="fail-btn"
                    onClick={() =>
                      failNode(
                        node.nodeId
                      )
                    }
                  >
                    Fail Node
                  </button>
                ) : (
                  <button
                    className="recover-btn"
                    onClick={() =>
                      recoverNode(
                        node.nodeId
                      )
                    }
                  >
                    Recover Node
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Consensus;