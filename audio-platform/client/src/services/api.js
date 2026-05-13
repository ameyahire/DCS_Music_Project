import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api",
});

export const uploadAudio = (data) =>
  API.post("/audio/upload", data);

export const getAudios = () =>
  API.get("/audio");

export const deleteAudio = (id) =>
  API.delete(`/audio/${id}`);

export const getStreamUrl = (filename) =>
  `${API.defaults.baseURL}/stream/${filename}`;