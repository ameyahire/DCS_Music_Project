import { useState } from "react";
import { uploadAudio } from "../../services/api";
import "./Upload.css";

function Upload() {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [fileInputKey, setFileInputKey] = useState(Date.now());

  const handleUpload = async () => {
    if (!file || !title) {
      alert("Please fill all fields");
      return;
    }

    const formData = new FormData();
    formData.append("audio", file);
    formData.append("title", title);

    await uploadAudio(formData);
    alert("Uploaded successfully!");
    setTitle("");
    setFile(null);
    setFileInputKey(Date.now());
  };

  return (
    <div className="upload-container">
      <h2>Upload Audio</h2>
      <input
        type="text"
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <input
        key={fileInputKey}
        type="file"
        accept="audio/*"
        onChange={(e) => setFile(e.target.files[0])}
      />
      <button onClick={handleUpload}>Upload</button>
    </div>
  );
}

export default Upload;