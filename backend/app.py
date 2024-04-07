from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from functions.videoToImageAndBack import convert_video_to_images, create_video, transcode_video
from functions.feature_extraction_and_overlay import feature_extraction_and_overlay
from functions.optical_flow import optical_flow
from functions.video_information import get_videos_information
import os
import numpy as np
import cv2



app = Flask(__name__)
CORS(app)

# give one folder before path
UPLOAD_FOLDER_VIDEO = 'uploaded_files'
app.config['UPLOAD_FOLDER_VIDEO'] = UPLOAD_FOLDER_VIDEO

class drone_config:
    def __init__(self, average_difference, coeff, rotation, frames):
        self.average_difference = average_difference
        self.coeff = coeff
        self.rotation = rotation
        self.frames = frames

@app.route('/api/upload', methods=['POST'])
def handle_upload():
    max_image_count = 0
    image_array = []
    drones = []

    #Checking if video was uploaded (and right format)
    if 'videos' not in request.files:
        return jsonify({'message': 'No videos uploaded'}), 400
    
    videos = request.files.getlist('videos')
    if len(videos) == 0:
        return jsonify({'message': 'No videos selected'}), 400
    
    for video in videos:
        if video.filename == '':
            return jsonify({'message': 'Invalid video filename'}), 400
        frames = convert_video_to_images(video)
        drone = drone_config([], 1, 0, frames)
        drones.append(drone)

    #--------------------------------------------------
    # Image upload

    if 'image' not in request.files:
        return jsonify({'message': 'No image uploaded'}), 400
    
    image = request.files['image']
    if image.filename == '':
        return jsonify({'message': 'No image selected'}), 400
    
    image_bytes = image.read()
    image_frame = np.frombuffer(image_bytes, dtype=np.uint8)
    image = cv2.imdecode(image_frame, cv2.IMREAD_UNCHANGED)
    image = cv2.resize(image, (image.shape[1] // 2, image.shape[0] // 2))

    for drone in drones:
        size = len(drone.frames)
        if max_image_count < size:
            max_image_count = size

    for _ in range(max_image_count):
        image_array.append(image)

    for drone in drones:
        image_array, prev_image, drone = feature_extraction_and_overlay(image, drone.frames, 0, image_array, drone)
        image_array = optical_flow(image, prev_image, drone.frames, drone, 1, image_array)

    # make right now time into string
    output_video_path = os.path.join(app.config['UPLOAD_FOLDER_VIDEO'], 'nice.mp4')
    print(output_video_path)
    create_video(image_array, output_video_path)
    # get one image resolution (separate)
    output_video_path_new = os.path.join(app.config['UPLOAD_FOLDER_VIDEO'], 'nice_new.mp4')
    transcode_video(output_video_path, output_video_path_new)
    video_url = f"http://localhost:5000/api/video/{output_video_path_new}"
    return jsonify({'message': 'Files uploaded successfully',
                    'output_video_path': video_url})

@app.route('/api/video/<path:video_path>')
def get_video(video_path):
    return send_file(video_path)

@app.route('/app/videos')
def get_videos():
    videos_infos = []
    videos_infos = get_videos_information(app.config['UPLOAD_FOLDER_VIDEO'])
    return jsonify({'videos_infos': videos_infos})

if __name__ == '__main__':
    app.run(debug=True)
