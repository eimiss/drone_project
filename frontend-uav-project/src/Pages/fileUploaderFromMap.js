import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../Components/Header';
import { Await } from 'react-router-dom';
import { Map, TileLayer, withLeaflet } from 'react-leaflet';
import '../Components/Style.css';
import 'leaflet/dist/leaflet.css';
import PrintControlDefault from 'react-leaflet-easyprint';
import { FaPhotoVideo } from "react-icons/fa";
import { IoImagesSharp } from "react-icons/io5";


const fetchImage = async (video) => {
    const response = await fetch(video.imageFile);
    const blob = await response.blob();
    const imageFile = new File([blob], 'image.png', { type: 'image/png' });
    return imageFile;
};

const UploaderFromMap = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [globalError, setGlobalError] = useState(null);
    const [imageData, setImageData] = useState({ imageFile: '', points: [], resolution: { width: 0, height: 0 } });
    const imageRef = useRef(null);
    const [videoData, setVideoData] = useState([]);
    const videoRefs = useRef([]);
    const PrintControl = withLeaflet(PrintControlDefault);
    const printControlRef = useRef(null);
    const navigate = useNavigate();

    const handleImageChange = (event) => {
        const imageFile = event.target.files[0];
        const imageSrc = URL.createObjectURL(imageFile);
        setImageData({ imageFile: imageSrc, points: [], resolution: { width: 0, height: 0 } });
    };

    const handleVideoChange = async (event) => {
        const videoFiles = event.target.files;
        // Send that video to the backend
        const formData = new FormData();
        formData.append('video', videoFiles[0]);

        try {
            const response = await fetch('http://localhost:5000/api/convertFirstFrame', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message);
            }

            const blob = await response.blob();
            const imageSrc = URL.createObjectURL(blob);
            setVideoData([...videoData, { videoFile: videoFiles[0], imageFile: imageSrc, points: [], resolution: { width: 0, height: 0 } }]);

        } catch (error) {
            setGlobalError(error.message);
            console.error('Error uploading files:', error);
        }
    }

    const addPoint = (imageIndex, event) => {
        const imageContainer = event.target.getBoundingClientRect();
        const x = event.clientX - imageContainer.left;
        const y = event.clientY - imageContainer.top;

        const newVideoData = [...videoData];
        newVideoData[imageIndex].points.push({ x, y });
        setVideoData(newVideoData);
        console.log(newVideoData);
    };

    const addPointImage = (event) => {
        const imageContainer = event.target.getBoundingClientRect();
        const x = event.clientX - imageContainer.left;
        const y = event.clientY - imageContainer.top;

        const newImageData = { ...imageData };
        newImageData.points.push({ x, y });
        setImageData(newImageData);
    }

    const handleUploadFromMap = async () => {
        const formData = new FormData();
        if (imageData) {
            const imageFile = await fetch(imageData.imageFile)
                .then(res => res.blob())
                .then(blob => new File([blob], 'image.png', { type: 'image/png' }));
            formData.append('imageFile', imageFile);
            formData.append('imagePoints', JSON.stringify(imageData.points));
            formData.append('imageResolution', JSON.stringify(imageData.resolution));
        }

        const videoImagePromises = videoData.map(video => fetchImage(video));
        const videoImages = await Promise.all(videoImagePromises);

        videoData.forEach((video, index) => {
            formData.append('videoImage', videoImages[index]);
            formData.append('videos', video.videoFile);
            formData.append('videoPoints', JSON.stringify(video.points));
            formData.append('videoResolution', JSON.stringify(video.resolution));
        });
        setIsLoading(true);
        try {
            const response = await fetch('http://localhost:5000/api/uploadFromMap', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message);
            }
            console.log(data);
            navigate('/videoWatch', { state: { videoPath: data.output_video_path } });
        } catch (error) {
            setIsLoading(false);
            setGlobalError(error.message);
            console.error('Error uploading files:', error);
        }
    }

    const getImageSize = () => {
        if (imageRef.current) {
            const { width, height } = imageRef.current.getBoundingClientRect();
            const newImageData = { ...imageData }
            newImageData.resolution = { width, height }
            setImageData(newImageData);
        }
    }

    const getVideoImageSize = (videoIndex) => {
        return () => {
            if (videoRefs.current[videoIndex]) {
                const { width, height } = videoRefs.current[videoIndex].getBoundingClientRect();
                const newVideoData = [...videoData];
                newVideoData[videoIndex].resolution = { width, height };
                setVideoData(newVideoData);
                console.log(newVideoData);
            }
        }
    }

    const RenderPoints = ({ points }) => {
        return points.map((point, index) => (
            <div
                key={index}
                style={{
                    position: 'absolute',
                    left: point.x,
                    top: point.y,
                    width: '10px',
                    height: '10px',
                    backgroundColor: 'red',
                    borderRadius: '50%',
                    transform: 'translate(-50%, -50%)', // Center the point
                }}
            ></div>
        ));
    };

    const dismissError = () => {
        setGlobalError(null);
    };

    return (
        <div style={styles.fullDiv}>
            <Header />
            {isLoading && (
                <div style={styles.loaderDiv}>
                    <div style={styles.loader}></div>
                </div>
            )}
            {globalError && (
                <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'red', color: 'white', padding: '10px' }}>
                    <div style={{ flex: 1 }}>{globalError}</div>
                    <button style={{ marginLeft: '10px' }} onClick={dismissError}>X</button>
                </div>
            )}
            <div style={styles.blackBorders}>
                <h2>Map</h2>
                <div>
                    <Map
                        center={[54.8990, 23.9128]}
                        zoom={13}
                        style={{ width: '1280px', height: '720px' }}
                    >
                        <TileLayer
                            url="https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                            attribution='&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                        />
                        <PrintControl position="topleft" sizeModes={['Current', 'A4Portrait', 'A4Landscape']} hideControlContainer={false} title="Export as PNG" exportOnly />
                    </Map>
                </div>
                <h2>Image Uploader</h2>
                {imageData.imageFile && (
                    <div>
                        <h3>Selected Image:</h3>
                        <div style={{ position: 'relative' }}>
                            <img
                                src={imageData.imageFile}
                                alt="Selected image"
                                style={styles.image}
                                onClick={addPointImage}
                                ref={imageRef}
                                onLoad={getImageSize}
                            />
                            <RenderPoints points={imageData.points} />
                        </div>
                    </div>
                )}
                <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} id="image-input" />
                <label htmlFor="image-input"><IoImagesSharp size={32} /></label>
                <h2>Selected Videos:</h2>
                {videoData.map((video, index) => (
                    <div key={index} style={{ position: 'relative' }}>
                        <img
                            src={video.imageFile}
                            alt={`Image ${index}`}
                            style={styles.image}
                            onClick={(event) => addPoint(index, event)}
                            ref={(el) => videoRefs.current[index] = el}
                            onLoad={getVideoImageSize(index)}
                        />
                        <RenderPoints points={video.points} />
                    </div>
                ))}
                <input type="file" accept="video/*" onChange={handleVideoChange} style={{ display: 'none' }} id="video-input" />
                <label htmlFor="video-input"><FaPhotoVideo size={32} /></label>
                <div style={styles.container}>
                    <button onClick={handleUploadFromMap} style={styles.uploadButton}>Upload</button>
                </div>
            </div>
        </div>
    );
};

export default UploaderFromMap;

const styles = {
    fullDiv: {
        backgroundColor: '#020853',
        height: '200vh',
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
    image: {
        width: '100%',
        height: 'auto',
    },
    uploadButton: {
        backgroundColor: '#007bff',
        color: '#000',
        padding: '10px 20px',
        fontSize: '20px',
        cursor: 'pointer',
        marginTop: '100px',
    },
    loaderDiv: {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
      },
      loader: {
        border: '8px solid #f3f3f3',
        borderRadius: '50%',
        borderTop: '8px solid #3498db',
        width: '50px',
        height: '50px',
        animation: 'spin 1s linear infinite',
      }
};

