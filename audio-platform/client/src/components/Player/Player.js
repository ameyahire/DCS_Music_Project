import { getStreamUrl } from "../../services/api";
import "./Player.css";

function Player({ filename }) {
  return (
    <div className="player">
      <audio controls>
        <source
          src={getStreamUrl(filename)}
          type="audio/mpeg"
        />
      </audio>
    </div>
  );
}

export default Player;