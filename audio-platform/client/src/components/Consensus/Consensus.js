import { useState, useEffect } from "react";
import { getAudios } from "../../services/api";
import "./Consensus.css";

const API_URL = "http://localhost:5001/api/consensus";

function Consensus() {
  const [status, setStatus] = useState(null);
  const [audios, setAudios] = useState([]);
  const [nodeHealth, setNodeHealth] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStatus();
    fetchAudios();
    fetchNodeHealth();
    const interval = setInterval(() => {
      fetchStatus();
      fetchNodeHealth();
    }, 2000); // Update every 2 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/status`);
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error("Failed to fetch consensus status:", error);
    }
  };

  const fetchAudios = async () => {
    try {
      const res = await getAudios();
      setAudios(res.data);
    } catch (error) {
      console.error("Failed to fetch audios:", error);
    }
  };

  const fetchNodeHealth = async () => {
    try {
      const response = await fetch(`${API_URL}/node-health`);
      const data = await response.json();
      setNodeHealth(data);
    } catch (error) {
      console.error("Failed to fetch node health:", error);
    }
  };

  const simulateNodeFailure = async (nodeId) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/simulate-failure/${nodeId}`, {
        method: "POST",
      });
      const data = await response.json();
      console.log(data.message);
      setNodeHealth(data.nodeHealth);
    } catch (error) {
      console.error(`Failed to simulate ${nodeId} failure:`, error);
    } finally {
      setLoading(false);
    }
  };

  const recoverNode = async (nodeId) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/recover-node/${nodeId}`, {
        method: "POST",
      });
      const data = await response.json();
      console.log(data.message);
      setNodeHealth(data.nodeHealth);
    } catch (error) {
      console.error(`Failed to recover ${nodeId}:`, error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="consensus-container">
      <h2>Distributed System Status & Testing</h2>

      {status && (
        <div className="consensus-status">
          <h3>Consensus Algorithm (Raft)</h3>
          <div className="status-grid">
            <div className="status-item">
              <strong>Node ID:</strong>
              <span className="status-value">{status.nodeId}</span>
            </div>
            <div className="status-item">
              <strong>State:</strong>
              <span className={`status-value ${status.state}`}>{status.state}</span>
            </div>
            <div className="status-item">
              <strong>Term:</strong>
              <span className="status-value">{status.term}</span>
            </div>
            <div className="status-item">
              <strong>Leader:</strong>
              <span className="status-value">{status.leader}</span>
            </div>
            <div className="status-item">
              <strong>Log Length:</strong>
              <span className="status-value">{status.logLength}</span>
            </div>
            <div className="status-item">
              <strong>Commit Index:</strong>
              <span className="status-value">{status.commitIndex}</span>
            </div>
          </div>
        </div>
      )}

      <div className="nodes-section">
        <h3>Distributed Storage Nodes - Node Failure Simulation</h3>
        <p className="hint">Click buttons below to simulate node failures or recovery</p>
        
        <div className="nodes-grid">
          {["node1", "node2", "node3"].map((nodeId) => {
            const health = nodeHealth[nodeId];
            const isHealthy = !health || health.isHealthy;
            const nodeRole = nodeId === "node1" ? "Primary" : nodeId === "node2" ? "Replica" : "Backup";
            
            return (
              <div key={nodeId} className={`node-card ${isHealthy ? "healthy-node" : "failed-node"}`}>
                <h4>{nodeId.toUpperCase()} ({nodeRole})</h4>
                <div className="node-info">
                  <strong>Role:</strong> {nodeRole} Storage
                </div>
                <div className="node-info">
                  <strong>Status:</strong>{" "}
                  <span className={`health-status ${isHealthy ? "healthy" : "unhealthy"}`}>
                    {isHealthy ? "🟢 Healthy" : "🔴 Failed"}
                  </span>
                </div>
                <div className="node-info">
                  <strong>Files:</strong> {audios.filter(a => {
                    if (nodeId === "node1") return a.primaryNode === "node1";
                    if (nodeId === "node2") return a.replicaNode === "node2";
                    return a.backupNode === "node3";
                  }).length}
                </div>
                {health && health.failedAt && (
                  <div className="node-info">
                    <strong>Failed at:</strong> {new Date(health.failedAt).toLocaleTimeString()}
                  </div>
                )}
                <div className="button-group">
                  {nodeId !== "node1" && (
                    <>
                      <button
                        className={`btn btn-danger ${loading ? "disabled" : ""}`}
                        onClick={() => simulateNodeFailure(nodeId)}
                        disabled={loading || !isHealthy}
                        title={isHealthy ? `Simulate ${nodeId} failure` : "Node already failed"}
                      >
                        ⚠️ Fail Node
                      </button>
                      <button
                        className={`btn btn-success ${loading ? "disabled" : ""}`}
                        onClick={() => recoverNode(nodeId)}
                        disabled={loading || isHealthy}
                        title={!isHealthy ? `Recover ${nodeId}` : "Node already healthy"}
                      >
                        ✅ Recover
                      </button>
                    </>
                  )}
                  {nodeId === "node1" && (
                    <div className="info-text">Primary node cannot fail in this test</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="features-list">
        <h3>How to Test Fault Tolerance</h3>
        <ol>
          <li><strong>Upload Music:</strong> Go to Upload tab and add some audio files</li>
          <li><strong>Simulate Failure:</strong> Click "⚠️ Fail Node" on Node 2 or Node 3</li>
          <li><strong>Stream Music:</strong> Try to play music from Library tab</li>
          <li><strong>Observe Failover:</strong> System should automatically use healthy nodes</li>
          <li><strong>Recover Node:</strong> Click "✅ Recover" to bring node back online</li>
          <li><strong>Verify Replication:</strong> Check System Status to see updated node health</li>
        </ol>
      </div>

      <div className="features-list">
        <h3>Distributed System Architecture</h3>
        <ul>
          <li><strong>Node 1 (Primary):</strong> Main storage and coordination center</li>
          <li><strong>Node 2 (Replica):</strong> Copy of all files for redundancy</li>
          <li><strong>Node 3 (Backup):</strong> Additional backup for fault tolerance</li>
          <li><strong>Consensus Algorithm:</strong> Raft-based leader election</li>
          <li><strong>Automatic Failover:</strong> When a node fails, system uses healthy replicas</li>
          <li><strong>Data Consistency:</strong> All nodes maintain consistent copies of metadata</li>
        </ul>
      </div>
    </div>
  );
}

export default Consensus;