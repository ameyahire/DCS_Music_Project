import { Link } from "react-router-dom";
import "./Navbar.css";

import MLogo from "../../assets/MLogo.png";

function Navbar() {
  return (
    <nav className="navbar">
      <div className="logo-container">
        <img
          src={MLogo}
          alt="Music Logo"
          className="navbar-logo"
        />
      </div>

      <div className="nav-links">
        <Link to="/">Home</Link>
        <Link to="/upload">Upload</Link>
        <Link to="/library">Library</Link>
        <Link to="/consensus">System Status</Link>
      </div>
    </nav>
  );
}

export default Navbar;