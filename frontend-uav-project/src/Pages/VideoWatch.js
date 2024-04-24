import React, { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import playIcon from '../Images/PlayButton.png';
import pauseIcon from '../Images/PauseButton.png';
import zoomInIcon from '../Images/ZoomIn.png';
import zoomOutIcon from '../Images/ZoomOut.png';
import Header from '../Components/Header';
import History from '../Pages/HistoryForVideoWatch';


const VideoWatch = () => {
    // Navigator
    const navigate = useNavigate();
    // Get video
    const location = useLocation();
    const videoUrl = location.state.videoPath;
    // State to track zoom level
    const [zoomLevel, setZoomLevel] = useState(1);
    // State to track video playback
    const [isPlaying, setIsPlaying] = useState(false);
    // State to track current time and duration of the video
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    // Ref for the video element and the seek bar input element
    const videoRef = useRef(null);
    const seekBarRef = useRef(null);
    // Mouse movements
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [offset, setOffset] = useState({ x: 0, y: 0 });

    // Following mouse inputs
    const handleMouseUp = () => {
        setIsDragging(false);
    }
    const handleMouseDown = (event) => {
        setIsDragging(true);
        setDragStart({ x: event.clientX, y: event.clientY });
    };

    const handleMouseMove = (event) => {
        if (!isDragging) return;

        const offsetX = (event.clientX - dragStart.x) / zoomLevel;
        const offsetY = (event.clientY - dragStart.y) / zoomLevel;

        // Calculate the new offset
        let newOffsetX = offset.x + offsetX;
        let newOffsetY = offset.y + offsetY;
        console.log(newOffsetX, newOffsetY);

        setOffset({
            x: newOffsetX,
            y: newOffsetY
        });

        setDragStart({ x: event.clientX, y: event.clientY });
    }

    // Function to handle zoom in
    const zoomIn = () => {
        setZoomLevel(zoomLevel + 0.1);
    };

    // Function to handle zoom out
    const zoomOut = () => {
        if (zoomLevel > 1) {
            setZoomLevel(zoomLevel - 0.1);
        }
    };

    // Function to toggle play/pause
    const togglePlayPause = () => {
        if (videoRef.current.paused) {
            videoRef.current.play();
            setIsPlaying(true);
        } else {
            videoRef.current.pause();
            setIsPlaying(false);
        }
    };

    // Function to handle seeking
    const handleSeek = (e) => {
        const seekTime = e.target.value;
        videoRef.current.currentTime = seekTime;
        setCurrentTime(seekTime);
    };

    // Effect to update duration of the video
    useEffect(() => {
        const updateDuration = () => {
            setDuration(videoRef.current.duration);
        };

        videoRef.current.addEventListener("loadedmetadata", updateDuration);

        return () => {
            videoRef.current.removeEventListener("loadedmetadata", updateDuration);
        };
    }, []);

    // Effect to update current time of the video
    useEffect(() => {
        const updateTime = () => {
            setCurrentTime(videoRef.current.currentTime);
        };

        videoRef.current.addEventListener("timeupdate", updateTime);

        return () => {
            videoRef.current.removeEventListener("timeupdate", updateTime);
        };
    }, []);

    // Custom video player with zoom
    const stylesVideo = {
        containerVideo: {
            overflow: "hidden",
            width: "100%",
            height: "auto",
            maxWidth: "1280 px",
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "center"
        },
        containerControls: {
            overflow: "hidden",
            width: "100%",
            height: "auto",
            margin: "0 auto",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
        },
        video: {
            transform: `scale(${zoomLevel}) translate(${offset.x}px, ${offset.y}px)`,
            transition: "transform 0.3s ease",
            maxWidth: "100%",
            cursor: isDragging ? 'grabbing' : 'grab',
        },
        blackBorders: {
            backgroundColor: '#020831',
            borderRadius: '10px',
            padding: '20px',
            color: 'white',
            margin: 'auto',
            maxWidth: '1280px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginTop: "10px"
        },
        iconStyle: {
            width: '30px',
            height: '30px',
        },
        seekBarStyle: {
            width: '88%',
            height: '38px',
            margin: '0 auto',
            display: 'block',
            background: '#dedede',
            overflow: 'hidden',
            position: 'relative',
            left: '0%',
        },
        seekBarTrackStyle: {
            'WebkitAppearance': 'none',
            height: '30%',
            width: '100%',
            background: '#c2c0c0',
        },
        fullDiv: {
            backgroundColor: '#020853',
        }
    };

    return (
        <div style={stylesVideo.fullDiv}>
            {/* Header */}
            <Header />
            {/* Custom video player div with black background */}
            <div style={stylesVideo.blackBorders}>
                <h1>Custom Video Player</h1>
                {/* Custom video player with zoom */}
                <div style={stylesVideo.containerVideo}>
                    <video ref={videoRef} src={videoUrl} style={stylesVideo.video}
                        onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} />
                </div>

                <div style={stylesVideo.containerControls}>
                    {/* Custom play/pause button */}
                    <button onClick={togglePlayPause}>
                        {isPlaying ? <img src={pauseIcon} alt="Pause" style={stylesVideo.iconStyle} /> :
                            <img src={playIcon} alt="Play" style={stylesVideo.iconStyle} />}
                    </button>
                    {/* Custom seek bar */}
                    <div style={stylesVideo.seekBarStyle}>
                        <input
                            ref={seekBarRef}
                            type="range"
                            min={0}
                            max={duration}
                            step={0.1}
                            value={currentTime}
                            onChange={handleSeek}
                            style={stylesVideo.seekBarTrackStyle}
                        />
                        {/* Custom controls for zoom */}
                    </div>
                    <button onClick={zoomIn}><img src={zoomInIcon} alt="Zoom in" style={stylesVideo.iconStyle} /></button>
                    <button onClick={zoomOut}><img src={zoomOutIcon} alt="Zoom out" style={stylesVideo.iconStyle} /></button>
                </div>
            </div>
            <History />
        </div>
    );
};


export default VideoWatch;