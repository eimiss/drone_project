import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../Components/Header';
import { FaPhotoVideo } from "react-icons/fa";
import { IoImagesSharp } from "react-icons/io5";
import placeHolder from '../Images/placeholder.png';

const Uploader = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedVideos, setSelectedVideos] = useState([]);

  const navigate = useNavigate();

  // Image stuff
  const handleImageChange = (event) => {
    const imageFile = event.target.files[0];
    setSelectedImage(imageFile);
  };

  // Video stuff
  const handleVideoChange = (event) => {
    const videoFiles = event.target.files;
    setSelectedVideos(prevVideos => [...prevVideos, ...videoFiles]);
  };

  const handleUpload = async () => {
    const formData = new FormData();
    if (selectedImage) {
      formData.append('image', selectedImage);
    }
    selectedVideos.forEach((videoFile) => {
      formData.append('videos', videoFile);
    })

    try {
      const response = await fetch('http://localhost:5000/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      console.log(data);
      navigate('/videoWatch', { state: { videoPath: data.output_video_path } });
    } catch (error) {
      console.error('Error uploading files:', error);
    }
  };

  const handleRemoveLastVideo = () => {
    if (selectedVideos.length > 0) {
      setSelectedVideos(prevVideos => prevVideos.slice(0, -1));
    }
  }

  return (
    <div style={styles.fullDiv}>
      <Header />
      <div style={styles.blackBorders}>
        <div style={styles.firstDiv}>
          <div style={styles.imageDiv}>
            <div style={styles.uploadImage}>
              <h2 style={styles.title}>Upload image</h2>
              <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} id="image-upload" />
              <label htmlFor="image-upload"><IoImagesSharp size={32} /></label>
            </div>
            {selectedImage ? (
              <div>
                <img src={URL.createObjectURL(selectedImage)} alt="Selected" style={styles.image} />
              </div>
            ) : (
              <div>
                <img src={placeHolder} alt="Placeholder" style={styles.image} />
              </div>
            )}
          </div>
          <div>
            <h2 style={styles.title}>Video Uploader</h2>
            <div style={styles.videoWrapper}>
              {selectedVideos.map((video, index) => {
                return (
                  <div key={video}>
                    <div style={styles.videoContainer}>
                      <video key={video} width="100%">
                        <source src={URL.createObjectURL(video)} type="video/mp4" />
                        Your browser does not support the video tag.
                      </video>
                      <div style={styles.overlay}>{video.name}</div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div style={styles.buttonContainer}>
              <button onClick={handleUpload} style={styles.uploadButton}>Upload</button>
              <button onClick={handleRemoveLastVideo} style={styles.removeButton}>Remove Last Video</button>
              <input type="file" accept="video/*" onChange={handleVideoChange} style={{ display: 'none' }} id="video-upload" />
              <label htmlFor="video-upload"><FaPhotoVideo size={32} /></label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Uploader;

const styles = {
  fullDiv: {
    backgroundColor: '#020853',
    height: '100vh',
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
  firstDiv: {
    display: 'flex',
    gap: '30px'
  },
  imageDiv: {
    minWidth: '75%',
    maxWidth: '75%'
  },
  title: {
    fontSize: '30px',
  },
  uploadImage: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewTitle: {
    fontSize: '20',
    marginBottom: '10px',
  },
  image: {
    border: '5px solid',
    borderRadius: '20px',
    maxWidth: '100%',
  },
  uploadButton: {
    backgroundColor: '#007bff',
    color: '#000',
    padding: '10px 20px',
    fontSize: '20px',
    cursor: 'pointer',
  },
  removeButton: {
    backgroundColor: '#FF0000',
    color: '#000',
    padding: '9px 22px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  videoContainer: {
    position: 'relative',
    marginBottom: '10px', // Add margin to create space between the video and button
  },
  videoWrapper: {
    maxHeight: '400px',
    overflowY: 'auto',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    color: '#fff',
    fontSize: '20px',
  },
  buttonContainer: {
    //Want each button to be on differnt sides
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: '20px',
    gap: '10px'
  }
};