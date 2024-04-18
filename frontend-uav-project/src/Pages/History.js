import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../Components/Header';
function History() {
    // Videos
    const [videos, setVideos] = useState([]);
    const navigate = useNavigate();
    // Getting all videos from backend
    useEffect(() => {
        const fetchVideos = async () => {
            try {
                const response = await fetch('http://localhost:5000/api/videos');
                if (!response.ok) {
                    throw new Error('Failed to fetch videos');
                }
                const data = await response.json();
                setVideos(data.videos_infos);
            } catch (error) {
                console.error(error);
            }
        };
        fetchVideos();
    }, []);

    const changeVideo = async (event) => {
        const formData = new FormData();
        formData.append('chosen_video_name', event);

        try {
            const response = await fetch('http://localhost:5000/api/video_change', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            navigate('/videoWatch', { state: { videoPath: data.output_video_path } });
        } catch (error) {
            console.error('Error changing files:', error);
        }
    }

    return (
        <div>
            <Header />
            <div style={allVideosStyle.divStyle}>
                <h1>Video list</h1>
                {videos.map((video) => (
                    <div key={video.name} style={allVideosStyle.videoContainer} onMouseOver={(e) =>
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'} onMouseOut={(e) =>
                            e.currentTarget.style.backgroundColor = 'transparent'} onClick={() => changeVideo(video.name)}>
                        <div style={allVideosStyle.thumbnailContainer}>
                            <img src={`data:image/jpeg;base64, ${video.frame}`} alt="Thumbnail" style={allVideosStyle.thumbnail} />
                        </div>
                        <div style={allVideosStyle.videoInfo}>
                            <h2>{video.name}</h2>
                            <p>{video.created_date}</p>
                        </div>
                        <p style={allVideosStyle.videoDuration}>{video.duration} seconds</p>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default History;

const allVideosStyle = {
    divStyle: {
        borderRadius: '20px',
        backgroundColor: '#01041b',
        overflow: "hidden",
        width: "100%",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        marginTop: "30px",
        color: "white"
    },
    videoContainer: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "90%",
        padding: "10px",
        margin: "5px",
        cursor: "pointer",
        border: "2px solid #ccc"
    },
    videoInfo: {
        flex: "1",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start"
    },
    videoDuration: {
        marginLeft: "10px"
    },
    thumbnailContainer: {
        width: "100px",
        height: "auto",
        marginRight: "10px"
    },
    thumbnail: {
        width: "100px",
        height: "100px",
    }
}