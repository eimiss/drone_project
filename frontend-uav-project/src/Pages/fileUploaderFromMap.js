import React, { useRef, useState, useEffect } from 'react';
import Header from '../Components/Header';
import { Await } from 'react-router-dom';

const fetchImage = async (video) => {
    const response = await fetch(video.imageFile);
    const blob = await response.blob();
    const imageFile = new File([blob], 'image.png', { type: 'image/png' });
    return imageFile;
};

const UploaderFromMap = () => {
    const [imageData, setImageData] = useState({ imageFile: '', points: [], resolution: { width: 0, height: 0 } });
    const imageRef = useRef(null);
    const [videoData, setVideoData] = useState([]);
    const videoRefs = useRef([]);


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

            const blob = await response.blob();
            const imageSrc = URL.createObjectURL(blob);
            setVideoData([...videoData, { videoFile: videoFiles[0], imageFile: imageSrc, points: [], resolution: { width: 0, height: 0 } }]);


        } catch (error) {
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
        try {
            const response = await fetch('http://localhost:5000/api/uploadFromMap', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            console.log(data);
        } catch (error) {
            console.error('Error uploading files:', error);
        }
    }

    const getImageSize = () => {
        if(imageRef.current) {
            const { width, height } = imageRef.current.getBoundingClientRect();
            const newImageData = {...imageData}
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

    return (
        <div>
            <Header />
            <div style={styles.container}>
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
                <input type="file" accept="image/*" onChange={handleImageChange} />
                <h3>Selected Videos:</h3>
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
                <input type="file" accept="video/*" onChange={handleVideoChange} />
                <div style={styles.container}>
                    <button onClick={handleUploadFromMap} style={styles.uploadButton}>Upload</button>
                </div>
            </div>
        </div>
    );
};

export default UploaderFromMap;

const styles = {
    container: {
        maxWidth: '1280px',
        margin: 'auto',
        padding: '20px',
        fontFamily: 'Arial, sans-serif',
    },
    image: {
        width: '100%',
        height: 'auto',
    }
};

