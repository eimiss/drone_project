import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import FileUploader from "./Pages/FileUploader";
import FileUploaderFromMap from "./Pages/FileUploaderFromMap";
import MainPage from "./Pages/MainPage";
import VideoWatch from "./Pages/VideoWatch";
import History from "./Pages/History";
import DroneView from "./Pages/DroneView";

export const Routing = () => {
    return(
        <Router>
            <Routes>
                <Route path="/" element={<MainPage />} />
                <Route path="/fileUploader" element={<FileUploader />} />
                <Route path="/fileUploaderFromMap" element={<FileUploaderFromMap />} />
                <Route path="/videoWatch" element={<VideoWatch />} />
                <Route path="/history" element={<History />} />
                <Route path="/droneView" element={<DroneView />} />
            </Routes>
        </Router>
    )
}