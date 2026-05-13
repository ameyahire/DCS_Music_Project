import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar/Navbar";
import Home from "./pages/Home";
import Library from "./pages/Library";
import UploadPage from "./pages/UploadPage";
import Consensus from "./components/Consensus/Consensus";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/library" element={<Library />} />
        <Route path="/consensus" element={<Consensus />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;