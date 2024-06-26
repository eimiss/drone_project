import threading
import base64
import datetime
import json
import os
import numpy as np
import cv2
import io
import time

from flask_socketio import SocketIO, emit
from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from functions.videoToImageAndBack import convert_video_to_images, create_video, transcode_video
from functions.feature_extraction_and_overlay import feature_extraction_and_overlay, feature_extraction_and_overlay_map, feature_extraction_and_overlay_live
from functions.optical_flow import optical_flow, optical_flow_map
from functions.video_information import get_videos_information, video_resolution_fix


app = Flask(__name__)
CORS(app)
MAX_BUFFER_SIZE = 50 * 1000 * 1000
socketio = SocketIO(app, cors_allowed_origins="*", 
                    async_mode='threading', max_http_buffer_size=MAX_BUFFER_SIZE, 
                    always_connect=True)

# give one folder before path
UPLOAD_FOLDER_VIDEO = 'uploaded_files'
app.config['UPLOAD_FOLDER_VIDEO'] = UPLOAD_FOLDER_VIDEO

# Global variables
global_frames = {}
terminate_threads = {}
thread_lock = threading.Lock()
air_drones = []
image_for_live = None

class drone_config:
    def __init__(self, average_difference, coeff, rotation, frames, transformation_matrix, isWarpped, prev_image, 
                 rtsp, image_number, resync, frame_color):
        self.average_difference = average_difference
        self.coeff = coeff
        self.rotation = rotation
        self.frames = frames
        self.transformation_matrix = transformation_matrix
        self.isWarped = isWarpped
        self.prev_image = prev_image
        self.rtsp = rtsp
        self.image_number = image_number
        self.resync = resync
        self.frame_color = frame_color

class images_from_video:
    def __init__(self, videoImage, video, videoPoints, videoResolution):
        self.videoImage = videoImage
        self.video = video
        self.videoPoints = videoPoints
        self.videoResolution = videoResolution
        

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
        drone = drone_config([], 1, 0, frames, None, False, None, None, 0, False, None)
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
    image = cv2.imdecode(image_frame, cv2.IMREAD_COLOR)

    image, _, _ = video_resolution_fix(image)

    for drone in drones:
        size = len(drone.frames)
        if max_image_count < size:
            max_image_count = size

    for _ in range(max_image_count):
        image_array.append(image)

    drone_counter = 0
    for drone in drones:
        drone_counter += 1
        skipping = False
        for i in range(len(drone.frames)):
            if drone.isWarped:
                print("running..." + str(i))
                image_array, drone = optical_flow(image, drone.frames[i], drone, image_array, i, drone_counter)
            else:
                if skipping:
                    if i % 50 == 0:
                        if drone_counter == 1:
                            image_array[i] = cv2.GaussianBlur(image_array[i], (35, 35), 0)
                        skipping = False
                        print("skipping done..." + str(i))
                    else:
                        if drone_counter == 1:
                            image_array[i] = cv2.GaussianBlur(image_array[i], (35, 35), 0)
                        print("skipping..." + str(i))
                else:
                    image_array, drone, skipping = feature_extraction_and_overlay(image, drone.frames[i], i, image_array, drone, drone_counter)

    now = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    output_video_path = os.path.join(app.config['UPLOAD_FOLDER_VIDEO'], 'Temp.mp4')
    print("Creating video")
    create_video(image_array, output_video_path)
    output_video_path_new = os.path.join(app.config['UPLOAD_FOLDER_VIDEO'], f'{now}.mp4')
    transcode_video(output_video_path, output_video_path_new)
    os.remove(output_video_path)
    video_url = f"http://localhost:5000/api/video/{output_video_path_new}"
    return jsonify({'message': 'Files uploaded successfully',
                    'output_video_path': video_url})

@app.route('/api/video_change', methods=['POST'])
def change_video():
    if 'chosen_video_name' not in request.form:    
        return jsonify({'message': 'No videos uploaded'}), 400
    video_path = os.path.join(app.config['UPLOAD_FOLDER_VIDEO'], request.form['chosen_video_name'])  
    if not os.path.exists(video_path):
        return jsonify({'message': 'Video not found'}), 400
    path = f"http://localhost:5000/api/video/{video_path}"
    return jsonify({'message': 'Video changed successfully',
                    'output_video_path': path})

@app.route('/api/video/<path:video_path>', methods=['GET'])
def get_video(video_path):
    return send_file(video_path)

@app.route('/api/videos', methods=['GET'])
def get_videos():
    videos_infos = []
    videos_infos = get_videos_information(app.config['UPLOAD_FOLDER_VIDEO'])
    return jsonify({'videos_infos': videos_infos})

@app.route('/api/convertFirstFrame', methods=['POST'])
def convertFirstFrame():
    if 'video' not in request.files:
        return jsonify({'message': 'No video uploaded'}), 400
    video = request.files['video']
    if video.filename == '':
        return jsonify({'message': 'No video selected'}), 400
    video_path = "temp_video_for_image.mp4"
    #Get the first frame
    video.save(video_path)
    cam = cv2.VideoCapture(video_path)
    _, frame = cam.read()
    cam.release()
    os.remove(video_path)

    ret, buffer = cv2.imencode('.jpg', frame)
    if not ret:
        return jsonify({'message': 'Error encoding image'}), 400
    return send_file(io.BytesIO(buffer), mimetype='image/jpeg')

@app.route('/api/uploadFromMap', methods=['POST'])
def handle_upload_from_map():
    video_datas = []
    # Image
    image_points_array = []
    max_image_count = 0
    image_array = []

    if 'imageFile' not in request.files:
        return jsonify({'message': 'No image uploaded'}), 400
    image = request.files['imageFile']
    if image.filename == '':
        return jsonify({'message': 'No image selected'}), 400
    image_bytes = image.read()
    image_frame = np.frombuffer(image_bytes, dtype=np.uint8)

    # Image points
    image_points = request.form.get('imagePoints')
    if image_points is None:
        return jsonify({'message': 'No image points uploaded'}), 400
    image_points = json.loads(image_points)
    x_values = [point['x'] for point in image_points]
    y_values = [point['y'] for point in image_points]

    # Image resolution
    image_resolution = request.form.get('imageResolution')
    if image_resolution is None:
        return jsonify({'message': 'No image resolution uploaded'}), 400
    
    base_image = cv2.imdecode(image_frame, cv2.IMREAD_COLOR)
    base_image, new_width, new_height = video_resolution_fix(base_image)

    image_resolution = json.loads(image_resolution)
    image_resolution_x = image_resolution['width']
    image_resolution_y = image_resolution['height']
    x_scale = new_width / image_resolution_x
    y_scale = new_height / image_resolution_y

    for i in range(len(x_values)):
        x_values[i] = x_values[i] * x_scale
        y_values[i] = y_values[i] * y_scale
        image_points_array.append([x_values[i], y_values[i]])

    if len(image_points_array) < 4:
        return jsonify({'message': 'Error: Minimum 4 points required'}), 400

    # Videos
    if 'videoImage' not in request.files:
        return jsonify({'message': 'No video image uploaded'}), 400
    if 'videos' not in request.files:
        return jsonify({'message': 'No videos uploaded'}), 400
    
    video_image_array = []
    video_images = request.files.getlist('videoImage')
    for video_image in video_images:
        if video_image.filename == '':
            return jsonify({'message': 'No video image selected'}), 400
        video_image_bytes = video_image.read()
        video_image_frame = np.frombuffer(video_image_bytes, dtype=np.uint8)
        video_image_decoded = cv2.imdecode(video_image_frame, cv2.IMREAD_COLOR)
        video_image, _, _ = video_resolution_fix(video_image_decoded) 
        video_image_array.append(video_image)


    videos_array = []
    videos = request.files.getlist('videos')
    for video in videos:
        if video.filename == '':
            return jsonify({'message': 'No video selected'}), 400
        frames = convert_video_to_images(video)
        videos_array.append(frames)

    video_points = request.form.getlist('videoPoints')
    if video_points is None:
        return jsonify({'message': 'No video points uploaded'}), 400
    video_resolution = request.form.getlist('videoResolution')
    if video_resolution is None:
        return jsonify({'message': 'No video resolution uploaded'}), 400

    for i in range(len(video_image_array)):
        # Recalculate points values via resolution
        original_image = video_image_array[i]
        original_image_shape = original_image.shape

        original_width = original_image_shape[1]
        original_height = original_image_shape[0]

        resolution_info = json.loads(video_resolution[i])
        new_width = resolution_info['width']
        new_height = resolution_info['height']

        x_scale = original_width / new_width
        y_scale = original_height / new_height
        points = video_points[i]
        points = json.loads(points)
        video_points_array = []
        for point in points:
            x = point['x'] * x_scale
            y = point['y'] * y_scale
            video_points_array.append([x, y])
        if len(video_points_array) != len(image_points_array):
            return jsonify({'message': 'Error: Different number of points in image and videos'}), 400
        video_data = images_from_video(video_image[i], videos_array[i], video_points_array, [original_width, original_height])
        video_datas.append(video_data)
    for video_data in video_datas:
        size = len(video_data.video)
        if max_image_count < size:
            max_image_count = size
    for _ in range(max_image_count):
        image_array.append(base_image)
    for video_data in video_datas:
        did_it_passed = False
        transf_matrix = []
        rotation = 0
        average_difference = [0, 0]
        for i in range(len(video_data.video)):
            if did_it_passed == False:
                image_array, transf_matrix, rotation = feature_extraction_and_overlay_map(base_image, image_points_array, video_data.video[i], video_data.videoPoints, image_array, i)
                did_it_passed = True
            else:
                image_array, average_difference = optical_flow_map(base_image, video_data.video[i], transf_matrix, video_data.video[i - 1], rotation, average_difference, image_array, i)
    
    now = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    output_video_path = os.path.join(app.config['UPLOAD_FOLDER_VIDEO'], 'Temp.mp4')
    print(output_video_path)
    create_video(image_array, output_video_path)
    output_video_path_new = os.path.join(app.config['UPLOAD_FOLDER_VIDEO'], f'{now}.mp4')
    transcode_video(output_video_path, output_video_path_new)
    # remove temp video
    os.remove(output_video_path)
    video_url = f"http://localhost:5000/api/video/{output_video_path_new}"

    return jsonify({'message': 'Files uploaded successfully',
                    'output_video_path': video_url})

@app.route('/api/air_drone_image', methods=['POST'])
def air_drone_image():
    global image_for_live
    if 'image' not in request.files:
        return jsonify({'message': 'No image uploaded'}), 400
    image = request.files['image']
    if image.filename == '':
        return jsonify({'message': 'No image selected'}), 400
    image_bytes = image.read()

    image_frame = np.frombuffer(image_bytes, dtype=np.uint8)
    image_decoded = cv2.imdecode(image_frame, cv2.IMREAD_COLOR)

    image, _, _ = video_resolution_fix(image_decoded)

    image_for_live = image
    return jsonify({'message': 'Image uploaded successfully'})

# SocketIO events
@socketio.on('connect')
def test_connect():
    print('Client connected')

@socketio.on('disconnect')
def test_disconnect():
    print('Client disconnected')

def read_rtsp_stream(rtsp_url):
    cap = cv2.VideoCapture(rtsp_url)
    if not cap.isOpened():
        print(f"Error opening stream for {rtsp_url}")
        return

    while not terminate_threads.get(rtsp_url, False):
        ret, frame = cap.read()
        if not ret:
            print(f"Error reading frame from {rtsp_url}")
            break

        with thread_lock:
            global_frames[rtsp_url] = frame

    cap.release()

def start_rtsp_stream(rtsp_urls):
    global terminate_threads

    # Terminate existing threads for the URLs
    for url in terminate_threads:
        terminate_threads[url] = True

    # Start new tasks for each RTSP URL
    for rtsp_url in rtsp_urls:
        terminate_threads[rtsp_url] = False
        socketio.start_background_task(target=read_rtsp_stream, rtsp_url=rtsp_url)

def stop_rtsp_stream(rtsp_urls):
    global terminate_threads
    for url in rtsp_urls:
        terminate_threads[url] = True

# Function to get the latest frame for an RTSP URL
def get_frame_from_global(rtsp_url):
    global global_frames
    with thread_lock:
        return global_frames.get(rtsp_url, None)

@socketio.on('set_up_rtsps')
def set_up_rtsps(rtsp_urls):
    print("Setting up RTSPs")
    start_rtsp_stream(rtsp_urls)
    emit('set_up_rtsps_response', 'RTSPs set up')

@socketio.on('stop_rtsps')
def stop_rtsps(rtsp_urls):
    print("Stopping RTSPs")
    stop_rtsp_stream(rtsp_urls)

@socketio.on('resync_drones')
def resync_drones():
    for drone in air_drones:
        drone.resync = True
    print('drones resynced')
    emit('resync_response', 'Drones resynced')

@socketio.on('get_frames')
def get_frames_live(rtsp_urls):
    global image_for_live
    image = image_for_live
    if image is None:
        emit('frame_error', 'No image available')
    else:
        # Drone initialization
        for rtsp_url in rtsp_urls:
            counter = 0
            for drone in air_drones:
                if drone.rtsp == rtsp_url:
                    frame = get_frame_from_global(drone.rtsp)
                    if frame is not None:
                        frame = cv2.copyMakeBorder(frame, 10, 10, 10, 10, cv2.BORDER_CONSTANT, value=drone.frame_color)
                        frame, _, _ = video_resolution_fix(frame)

                        drone.frames = [frame]
                        counter += 1
            if counter == 0:
                frame = get_frame_from_global(rtsp_url)
                if frame is not None:
                    random_color = (np.random.randint(0, 255), np.random.randint(0, 255), np.random.randint(0, 255))
                    frame = cv2.copyMakeBorder(frame, 10, 10, 10, 10, cv2.BORDER_CONSTANT, value=random_color)
                    frame, _, _ = video_resolution_fix(frame)

                    drone = drone_config([], 1, 0, [frame], None, False, None, rtsp_url, 0, False, random_color)
                    air_drones.append(drone)

        image_array = [image]
        drone_counter = 0
        if image_array is not None:
            for drone in air_drones:
                drone_counter += 1
                if drone.isWarped:
                    image_array, drone = optical_flow(image, drone.frames[0], drone, image_array, 0, drone_counter)
                    if drone.resync:
                        drone.isWarped = False
                        drone.resync = False
                    else:
                        drone.isWarped = True
                else:
                    print("Extracting features")
                    image_array, drone = feature_extraction_and_overlay_live(image, drone.frames[0], 0, image_array, drone)

        mainImage = image_array[0]
        ret, buffer = cv2.imencode('.jpg', mainImage)
        if not ret:
            emit('frame_error', 'Error encoding image')
        jpg_as_text = base64.b64encode(buffer).decode('utf-8')
        emit('frame_response', jpg_as_text)


if __name__ == '__main__':
    socketio.run(app, debug=True)
    
