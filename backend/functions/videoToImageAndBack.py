import threading
import cv2
import os
import numpy as np
from moviepy.editor import VideoFileClip
from functions.video_information import video_resolution_fix

def remove_black_borders(image, border_size):
    height, width = image.shape[:2]
    cropped_image = image[border_size:height, border_size:width-border_size]
    return cropped_image

def convert_video_to_images(video):
    random_color = (np.random.randint(0, 255), np.random.randint(0, 255), np.random.randint(0, 255))
    video_path = "temp_video.mp4"
    video.save(video_path)
    cam = cv2.VideoCapture(video_path)
    frames = []
    while True:
        ret, frame = cam.read()
        if not ret:
            break

        # Removing black borders (should know how many pixels to remove)
        frame = remove_black_borders(frame, 65)
        # Adding frames of random color
        frame = cv2.copyMakeBorder(frame, 10, 10, 10, 10, cv2.BORDER_CONSTANT, value=random_color)

        frame, _, _ = video_resolution_fix(frame)
        frames.append(frame)
    cam.release()
    os.remove(video_path)
    return frames

def create_video(images, output_video_path, fps=30):
    height, width, _ = images[0].shape

    # Define video codec and create VideoWriter object
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_video_path, fourcc, fps, (width, height))

    # Write images to video
    for image in images:
        out.write(image)
    
    out.release()

def transcode_video(video_path, output_path):
    clip = VideoFileClip(video_path)
    clip.write_videofile(output_path, codec='libx264')

