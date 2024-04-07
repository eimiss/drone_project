import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

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

  const handleVideoRemove = (index) => {
    const updatedVideos = [...selectedVideos];
    updatedVideos.splice(index, 1);
    setSelectedVideos(updatedVideos);
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
      navigate('/videoWatch', {state: {videoPath: data.output_video_path}});
    } catch (error) {
      console.error('Error uploading files:', error);
    }
  };

  return (
    <div style={styles.container}>
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

    <h2 style={styles.title}>Video Uploader</h2>
      {selectedVideos.map((video, index) => { return (
        <div key={video} style={styles.previewContainer}>
          <h3 style={styles.previewTitle}>Selected Video {index + 1}:</h3>
          <div style={styles.videoContainer}>
            <button onClick={() => handleVideoRemove(index)} style={styles.removeButton}>Remove</button>
            <div style={styles.videoPreview}>
              <video key={video} width="400" height="300" controls style={styles.video}>
                <source src={URL.createObjectURL(video)} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
        </div>
      )})}
    <input type="file" accept="video/*" onChange={handleVideoChange} style={{ display:'none'}} id="video-upload"/>
    <label htmlFor="video-upload" style={styles.customVideoInput}>Choose Video</label>
    <div style={styles.container}>
      <button onClick={handleUpload} style={styles.uploadButton}>Upload</button>
    </div>
  </div>
  );
};

export default Uploader;

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