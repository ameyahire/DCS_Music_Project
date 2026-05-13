import { useEffect, useState } from "react";
import { getAudios, deleteAudio } from "../services/api";
import Player from "../components/Player/Player";

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
    <div style={{ padding: "20px" }}>
      <h2>Library</h2>

      {audios.map((audio) => (
        <div key={audio._id} style={{ marginBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div>
              <h4>{audio.title}</h4>
              <p style={{ margin: 0, color: "#666" }}>
                Primary: {audio.primaryNode} | Replica: {audio.replicaNode} | Backup: {audio.backupNode || "none"}
              </p>
            </div>
            <button onClick={() => handleDelete(audio._id)}>
              Delete
            </button>
          </div>
          <Player filename={audio.filename} />
        </div>
      ))}
    </div>
  );
}

export default Library;