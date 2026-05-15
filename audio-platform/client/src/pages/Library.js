import { useEffect, useState } from "react";

import {
  getAudios,
  deleteAudio,
} from "../services/api";

import Player from "../components/Player/Player";

import "./Library.css";

import placeholder from "../assets/placeholder.png";

function Library() {
  const [audios, setAudios] = useState([]);

  useEffect(() => {
    fetchAudios();
  }, []);

  const fetchAudios = async () => {
    const res = await getAudios();

    setAudios(res.data);
  };

  const handleDelete = async (id) => {
    if (
      !window.confirm(
        "Delete this audio?"
      )
    )
      return;

    await deleteAudio(id);

    fetchAudios();
  };

  return (
    <div className="library-page">
      <h1 className="library-title">
        Music Library
      </h1>

      <div className="music-list">
        {audios.map((audio) => (
          <div
            key={audio._id}
            className="music-item"
          >
            {/* LEFT */}
            <div className="music-left">
              <img
                src={placeholder}
                alt="cover"
                className="music-image"
              />

              <div className="music-info">
                <h3>{audio.title}</h3>

                <div className="node-info">
                  <span className="node-badge primary-node">
                   Primary: {audio.primaryNode}
                 </span>
                        
                 <span className="node-badge replica-node">
                   Replica: {audio.replicaNode}
                 </span>

                 <span className="node-badge backup-node">
                    Backup: {audio.backupNode || "none"}
                  </span>
                </div>

                <div className="music-player">
                  <Player
                    filename={audio.filename}
                  />
                </div>
              </div>
            </div>

            {/* RIGHT */}
            <div className="music-right">
              <button
                className="delete-btn"
                onClick={() =>
                  handleDelete(audio._id)
                }
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Library;