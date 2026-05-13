import { useEffect, useState } from "react";
import { getAudios, deleteAudio } from "../services/api";
import Player from "../components/Player/Player";

import "./Library.css";

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
    if (!window.confirm("Delete this audio?")) return;

    await deleteAudio(id);

    fetchAudios();
  };

  return (
    <div className="library-container">
      <h2 className="library-title">
        Distributed Audio Library
      </h2>

      {audios.length === 0 ? (
        <div className="empty-library">
          No audio files uploaded yet.
        </div>
      ) : (
        audios.map((audio) => (
          <div
            key={audio._id}
            className="audio-card"
          >
            <div className="audio-header">
              <div className="audio-info">
                <h4>{audio.title}</h4>

                <div>
                  <span className="node-tag primary-tag">
                    Primary: {audio.primaryNode}
                  </span>

                  <span className="node-tag replica-tag">
                    Replica: {audio.replicaNode}
                  </span>

                  <span className="node-tag backup-tag">
                    Backup:{" "}
                    {audio.backupNode || "none"}
                  </span>
                </div>
              </div>

              <button
                className="delete-btn"
                onClick={() =>
                  handleDelete(audio._id)
                }
              >
                Delete
              </button>
            </div>

            <Player filename={audio.filename} />
          </div>
        ))
      )}
    </div>
  );
}

export default Library;