import "./Home.css";

function Home() {
  return (
    <div className="home-container">
      <div className="home-card">
        <h1 className="home-title">
          Welcome to{" "}
          <span>Audio Platform</span>
        </h1>

        <p className="home-subtitle">
          A Distributed Music Streaming &
          Storage Platform implementing
          Raft Consensus, Fault Tolerance,
          Replication, and Distributed
          Communication System concepts.
        </p>

        <div className="features-grid">
          <div className="feature-card">
            <h3>Distributed Storage</h3>

            <p>
              Store music across multiple
              distributed nodes.
            </p>
          </div>

          <div className="feature-card">
            <h3>Fault Tolerance</h3>

            <p>
              System continues working even
              when nodes fail.
            </p>
          </div>

          <div className="feature-card">
            <h3>Raft Consensus</h3>

            <p>
              Leader election and heartbeat
              synchronization between nodes.
            </p>
          </div>

          <div className="feature-card">
            <h3>Music Streaming</h3>

            <p>
              Upload, stream, and download
              audio using distributed
              architecture.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;