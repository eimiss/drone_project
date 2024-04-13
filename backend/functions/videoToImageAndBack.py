import cv2
import os
import numpy as np
from moviepy.editor import VideoFileClip

def convert_video_to_images(video):
    video_path = "temp_video.mp4"
    video.save(video_path)
    cam = cv2.VideoCapture(video_path)
    frames = []
    while True:
        ret, frame = cam.read()
        if not ret:
            break
        new_width = int(frame.shape[1] * (2/3))
        new_height = int(frame.shape[0] * (2/3))
        frame = cv2.resize(frame, (new_width, new_height))
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