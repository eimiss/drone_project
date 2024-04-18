import React, { useRef, useState, useEffect } from 'react';
import Header from '../Components/Header';

const UploaderFromMap = () => {
    const iframeRef = useRef(null);
    const [selectedImage, setSelectedImage] = useState(null);

    const handleImageChange = (event) => {
        const imageFile = event.target.files[0];
        setSelectedImage(imageFile);
    };


    return (
        <div>
            <Header />
            <div style={mapStyle}>
                <iframe 
                    width="1280"
                    height="720"
                    ref={iframeRef}
                    src="https://www.geoportal.lt/map/mapgen/map2.html#b=Ortofoto-3346&x=497542&y=6084789&l=11&olid=GKPIS&op=0.7&id=fda89eb3-b1b1-4d58-f43a-841c25bc07d5&lang=lt"
                >
                </iframe>

                <h2 style={styles.title}>Image Uploader</h2>
                {selectedImage && (
                    <div style={styles.previewContainer}>
                        <h3 style={styles.previewTitle}>Selected Image:</h3>
                        <div style={styles.imagePreview}>
                            <img src={URL.createObjectURL(selectedImage)} alt="Selected" style={styles.image} />
                        </div>
                    </div>
                )}
                <input type="file" accept="image/*" onChange={handleImageChange} />
            </div>
        </div>
    )
};

export default UploaderFromMap;

const mapStyle = {
    margin: 'auto',
    backgroundColor: '#cccdcf',
    marginTop: '20px',
    borderRadius: '20px',
    justifyContent: 'center',
    height: "720 px",
    display: "flex",
    maxWidth: "80%",
    flexDirection: 'column',
}

const styles = {
    container: {
      maxWidth: '600px',
      margin: 'auto',
      padding: '20px',
      fontFamily: 'Arial, sans-serif',
    },
    title: {
      fontSize: '20px',
      marginBottom: '10px',
    },
    previewContainer: {
      marginBottom: '20px',
    },
    previewTitle: {
      fontSize: '20',
      marginBottom: '10px',
    },
    imagePreview: {
      border: '5px solid',
      padding: '10px',
    },
    image: {
      maxWidth: '100%',
    },
    videoPreview: {
      border: '5px solid',
      padding: '10px',
    },
    video: {
      maxWidth: '100%',
    },
    customVideoInput: {
      backgroundColor: '#cccdcf',
      color: '#000',
      padding: '5px 10px',
      fontSize: '15px',
      cursor: 'pointer',
    },
    uploadButton: {
      backgroundColor: '#007bff',
      color: '#000',
      padding: '10px 20px',
      fontSize: '20px',
      cursor: 'pointer',
    },
    videoContainer: {
      position: 'relative',
      marginBottom: '10px', // Add margin to create space between the video and button
    },
    removeButton: {
      position: 'absolute',
      top: '5px',
      right: '5px',
      zIndex: '1', // Ensures the button is above the video
      backgroundColor: '#ff0000', // Adjust as needed
      color: '#fff', // Adjust as needed
      border: 'none',
      borderRadius: '5px',
      padding: '5px 10px',
      cursor: 'pointer',
    },
  };