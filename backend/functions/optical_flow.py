import math
import cv2
import imutils
import numpy as np
import skimage

def make_background_transparent(image):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    thresh = cv2.threshold(gray, 11, 255, cv2.THRESH_BINARY)[1]
    # apply morphology to clean small spots
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3,3))
    morph = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel, borderType=cv2.BORDER_CONSTANT, borderValue=0)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3,3))
    morph = cv2.morphologyEx(morph, cv2.MORPH_CLOSE, kernel, borderType=cv2.BORDER_CONSTANT, borderValue=0)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3,3))
    morph = cv2.morphologyEx(morph, cv2.MORPH_ERODE, kernel, borderType=cv2.BORDER_CONSTANT, borderValue=0)

    # get external contour
    contours = cv2.findContours(morph, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    contours = contours[0] if len(contours) == 2 else contours[1]
    big_contour = max(contours, key=cv2.contourArea)
    # draw white filled contour on black background as mas
    contour = np.zeros_like(gray)
    cv2.drawContours(contour, [big_contour], 0, 255, -1)

    # blur dilate image
    blur = cv2.GaussianBlur(contour, (5,5), sigmaX=0, sigmaY=0, borderType = cv2.BORDER_DEFAULT)

    # stretch so that 255 -> 255 and 127.5 -> 0
    mask = skimage.exposure.rescale_intensity(blur, in_range=(127.5,255), out_range=(0,255))

    # put mask into alpha channel of input
    result = cv2.cvtColor(image, cv2.COLOR_BGR2BGRA)
    result[:,:,3] = mask
    return result

def making_image(base_image, rotated_optical_flow_image, average_difference, all_images, transformation_matrix, image_number):
    new_transformation_matrix = np.array([[1, 0, -average_difference[0]],
                                          [0, 1, -average_difference[1]],
                                          [0, 0, 1]])
    transform_matrix = np.dot(transformation_matrix, new_transformation_matrix)
    warped_image = cv2.warpAffine(rotated_optical_flow_image, transform_matrix, (base_image.shape[1], base_image.shape[0]))
    # load image
    transparent_image = make_background_transparent(warped_image)

    # Extract the foreground and alpha channels
    foreground_img = transparent_image[:, :, :3]
    alpha_mask = transparent_image[:, :, 3]

    # Create a mask for the transparent regions
    inverse_alpha_mask = cv2.bitwise_not(alpha_mask)

    # Create a masked foreground image
    masked_foreground = cv2.bitwise_and(foreground_img, foreground_img, mask=alpha_mask)

    # Create a masked background image
    masked_background = cv2.bitwise_and(all_images[image_number], all_images[image_number], mask=inverse_alpha_mask)

    # Overlay the masked foreground onto the masked background
    overlayed_image = cv2.add(masked_foreground, masked_background)

    all_images[image_number] = overlayed_image


def optical_flow(base_image, overlay_image, drone, image_array, image_number):
    prev_gray = cv2.cvtColor(drone.prev_image, cv2.COLOR_BGR2GRAY)
    prev_gray = cv2.resize(prev_gray, (int(prev_gray.shape[1] * drone.coeff), int(prev_gray.shape[0] * drone.coeff)))
    # Initialize previous points for optical flow
    prev_pts = cv2.goodFeaturesToTrack(prev_gray, maxCorners=100, qualityLevel=0.3, minDistance=7, blockSize=7)

    # Convert current frame to grayscale
    current_gray = cv2.cvtColor(overlay_image, cv2.COLOR_BGR2GRAY)
    current_gray = cv2.resize(current_gray, (int(current_gray.shape[1] * drone.coeff), int(current_gray.shape[0] * drone.coeff)))
    
    current_image = overlay_image
    current_image = cv2.resize(current_image, (int(current_image.shape[1] * drone.coeff), int(current_image.shape[0] * drone.coeff)))

    rotated_optical_flow_image = imutils.rotate_bound(current_image, -drone.rotation)
    # Compute optical flow
    next_pts, status, _ = cv2.calcOpticalFlowPyrLK(prev_gray, current_gray, prev_pts, None)

    # Filter valid points
    valid_prev_pts = prev_pts[status == 1]
    valid_next_pts = next_pts[status == 1]

    # Calculate displacement between points
    displacement = valid_next_pts - valid_prev_pts
    
    # Calculate average displacement (shift) in x and y directions
    shift_x = np.mean(displacement[:, 0])
    shift_y = np.mean(displacement[:, 1])

    # Convert rotation angle to radians
    rotation_angle_rad = math.radians(drone.rotation)

    shift_x_rotated = shift_x * math.cos(rotation_angle_rad) + shift_y * math.sin(rotation_angle_rad)
    shift_y_rotated = -shift_x * math.sin(rotation_angle_rad) + shift_y * math.cos(rotation_angle_rad)

    # Add rotated shift values to original coordinates
    drone.average_difference[0] = drone.average_difference[0] + shift_x_rotated
    drone.average_difference[1] = drone.average_difference[1] + shift_y_rotated

    # Update previous points for the next iteration
    making_image(base_image, rotated_optical_flow_image, drone.average_difference, image_array, drone.transformation_matrix, image_number)

    # Update previous frame
    drone.prev_image = overlay_image

    if image_number % 100 == 0:
        drone.isWarped = False
    
    return image_array, drone

def optical_flow_map(base_image, overlay_image, transf_matrix, prev_image, rotation, average_difference, image_array, image_number):
    prev_gray = cv2.cvtColor(prev_image, cv2.COLOR_BGR2GRAY)
    # Initialize previous points for optical flow
    prev_pts = cv2.goodFeaturesToTrack(prev_gray, maxCorners=100, qualityLevel=0.3, minDistance=7, blockSize=7)

    # Convert current frame to grayscale
    current_gray = cv2.cvtColor(overlay_image, cv2.COLOR_BGR2GRAY)
    current_image = overlay_image
    rotated_optical_flow_image = imutils.rotate_bound(current_image, -rotation)

    # Compute optical flow
    next_pts, status, _ = cv2.calcOpticalFlowPyrLK(prev_gray, current_gray, prev_pts, None)

    # Filter valid points
    valid_prev_pts = prev_pts[status == 1]
    valid_next_pts = next_pts[status == 1]

    # Calculate displacement between points
    displacement = valid_next_pts - valid_prev_pts

    # Calculate average displacement (shift) in x and y directions
    shift_x = np.mean(displacement[:, 0])
    shift_y = np.mean(displacement[:, 1])

    # Convert rotation angle to radians
    rotation_angle_rad = math.radians(rotation)

    shift_x_rotated = shift_x * math.cos(rotation_angle_rad) + shift_y * math.sin(rotation_angle_rad)
    shift_y_rotated = -shift_x * math.sin(rotation_angle_rad) + shift_y * math.cos(rotation_angle_rad)

    # Add rotated shift values to original coordinates
    average_difference[0] = average_difference[0] + shift_x_rotated
    average_difference[1] = average_difference[1] + shift_y_rotated

    # Update previous points for the next iteration
    making_image(base_image, rotated_optical_flow_image, average_difference, image_array, transf_matrix, image_number)


    return image_array, average_difference