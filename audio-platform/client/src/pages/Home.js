import { Link } from "react-router-dom";

import "./Home.css";

import bgVideo from "../assets/bgvideo.mp4";

function Home() {
  return (
    <div className="home-container">
      {/* Background Video */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="background-video"
      >
        <source
          src={bgVideo}
          type="video/mp4"
        />
      </video>

      {/* Overlay */}
      <div className="overlay"></div>

      {/* Content */}
      <div className="hero-content">
        <h1 className="hero-title">
           Audio Platform
        </h1>

        <p className="hero-subtitle">
          Stream, upload, and manage music
          using distributed storage,
          replication, fault tolerance, and
          Raft consensus algorithms.
        </p>

        <div className="hero-buttons">
          <Link
            to="/upload"
            className="primary-btn"
          >
            Add Music
          </Link>

          <Link
            to="/library"
            className="secondary-btn"
          >
            View Library
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Home;