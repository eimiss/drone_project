import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import FileUploader from "./Pages/FileUploader";
import MainPage from "./Pages/MainPage";
import VideoWatch from "./Pages/VideoWatch";
import History from "./Pages/History";

export const Routing = () => {
    return(
        <Router>
            <Routes>
                <Route path="/" element={<MainPage />} />
                <Route path="/fileUploader" element={<FileUploader />} />
                <Route path="/videoWatch" element={<VideoWatch />} />
                <Route path="/history" element={<History />} />
            </Routes>
        </Router>
    )
}