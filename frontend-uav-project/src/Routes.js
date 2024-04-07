import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import FileUploader from "./Pages/FileUploader";
import MainPage from "./Pages/MainPage";
import VideoWatch from "./Pages/VideoWatch";

export const Routing = () => {
    return(
        <Router>
            <Routes>
                <Route path="/" element={<MainPage />} />
                <Route path="/fileUploader" element={<FileUploader />} />
                <Route path="/videoWatch" element={<VideoWatch />} />
            </Routes>
        </Router>
    )
}