import Header from '../Components/Header';
import React, { useState, useEffect } from 'react';
import io from 'socket.io-client'
import placeHolder from '../Images/placeholder.png';

const socket = io('http://localhost:5000');

const DroneView = () => {
    const [selectedImage, setSelectedImage] = useState(null);
    const [shownImage, setShownImage] = useState(null);
    const [rtsps, setRtsp] = useState([]);
    const [text, setText] = useState('');
    const [isLiveOn, setIsLiveOn] = useState(false);

    const handleImageChange = (event) => {
        const imageFile = event.target.files[0];
        setSelectedImage(imageFile);
        const reader = new FileReader();
        reader.onload = (e) => {
            setShownImage(e.target.result);
        }
        reader.readAsDataURL(imageFile);
    };

    useEffect(() => {
        if (selectedImage) {
            handleUploadImage();
        }
    }, [selectedImage]);

    const handleUploadImage = async () => {
        const formData = new FormData();
        formData.append('image', selectedImage);
        console.log(selectedImage);
        try {
            const response = await fetch('http://localhost:5000/api/air_drone_image', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            console.log(data.message);
        } catch (error) {
            console.error('Error uploading image:', error);
        }
    }

    const handleTextChange = (event) => {
        setText(event.target.value);
    }

    const handleRtspChange = () => {
        setRtsp([...rtsps, text]);
        setText('');
    }

    useEffect(() => {
        socket.on('frame_response', (frame) => {
            setShownImage(`data:image/jpeg;base64,${frame}`);
            // Once we receive a frame response, we can request the next frame
            if (isLiveOn) {
                socket.emit('get_frames', rtsps);
            }
        });
        socket.on('frame_error', (error) => {
            console.error('Frame Error:', error);
        });

        return () => {
            socket.off('frame_response');
            socket.off('frame_error');
        };
    }, [isLiveOn, rtsps]);


    const startVideoUpdate = () => {
        if (rtsps.length === 0) {
            console.log('No RTSPs to display');
            return;
        }

        // Request frames when the button is clicked
        socket.emit('get_frames', rtsps);
        setIsLiveOn(true);
    };

    const stopVideoUpdate = () => {
        if (rtsps.length === 0) {
            console.log('No RTSPs to display');
            return;
        }

        socket.emit('stop_rtsps', rtsps);
        setIsLiveOn(false);
    }
    const setUpRtsps = () => {
        if (rtsps.length === 0) {
            console.log('No RTSPs to display');
            return;
        }

        socket.emit('set_up_rtsps', rtsps);
    }

    const resyncDrones = () => {
        socket.emit('resync_drones');
    }
    return (
        <div style={stylesDroneView.fullDiv}>
            <Header />
            <div style={stylesDroneView.blackBorders}>
                <h1>Drone View</h1>
                <input type="file" accept="image/*" onChange={handleImageChange} />
                {shownImage ? (
                    <img style={stylesDroneView.containerVideo} src={shownImage} alt="Selected image" />
                ) : (
                    <img src={placeHolder} alt="Placeholder" style={stylesDroneView.containerVideo} />
                )}
                <div style={stylesDroneView.firstDiv}>
                    <div>
                        <h1>Input Drone RTSP</h1>
                        <input
                            type="text"
                            value={text}
                            onChange={handleTextChange}
                            style={stylesDroneView.inputStyle}
                        />
                        <div>
                            <button onClick={handleRtspChange}>Add RTSP</button>
                            <button onClick={setUpRtsps}>Set up rtsps</button>
                        </div>
                    </div>
                    <div>
                        {rtsps.map((rtsp, index) => (
                            <p key={index}>{rtsp}</p>
                        ))}
                    </div>
                    <div>
                        {isLiveOn ? <button onClick={stopVideoUpdate} style={stylesDroneView.uploadButton}>Stop</button> : <button onClick={startVideoUpdate} style={stylesDroneView.uploadButton}>Start</button>}
                        <button onClick={resyncDrones} style={stylesDroneView.uploadButton}>Resync drones</button>
                    </div>
                </div>
            </div>
        </div>
    )

};
export default DroneView

const stylesDroneView = {
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
    fullDiv: {
        backgroundColor: '#020853',
        height: '150vh',
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
    inputStyle: {
        border: '2px solid #ccc',
        borderRadius: '5px',
        padding: '10px',
        width: '300px',
        display: 'flex',
        alignItems: 'center',
    },
    firstDiv: {
        display: 'flex',
        gap: '400px'
    },
    uploadButton: {
        backgroundColor: '#007bff',
        color: '#000',
        padding: '20px 20px',
        fontSize: '20px',
        cursor: 'pointer',
        marginTop: '20px',
        width: '110px', // Set a fixed width for all buttons
    },
}