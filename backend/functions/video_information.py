import cv2
from moviepy.editor import VideoFileClip
from io import BytesIO
from PIL import Image
import datetime
import os
import base64

import numpy as np

def video_resolution_fix(image):
    #Put iamge shape into width and height
    fixed_width = 1600
    height, width, _ = image.shape
    if width > fixed_width:
        size_width_coeff = width / fixed_width
        new_width = int(width / size_width_coeff)
        new_height = int(height / size_width_coeff)
        image = cv2.resize(image, (new_width, new_height))
        return image, width, height
    else:
        return image, width, height


def get_videos_information(path):
    videos_infos = []
    for filename in os.listdir(path):
        if filename.endswith('.mp4'):
            filepath = os.path.join(path, filename)
            created_date = datetime.datetime.fromtimestamp(os.path.getctime(filepath))
            video = VideoFileClip(filepath)
            frame = video.get_frame(0)
            duration = video.duration
            video.close()

            # Convert numpy array to PIL image
            image = Image.fromarray(np.uint8(frame))

            # Encoding frame
            buffer = BytesIO()
            image.save(buffer, format="JPEG")
            encoded_frame = base64.b64encode(buffer.getvalue()).decode("utf-8")

            video_info = {
                'name': filename,
                'created_date': created_date.strftime('%Y-%m-%d %H:%M:%S'),
                'duration': duration,
                'frame': encoded_frame
            }
            videos_infos.append(video_info)
    return videos_infos