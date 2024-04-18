import numpy as np
import cv2
from matplotlib import pyplot as plt
import imutils
import skimage.exposure
import math

MIN_MATCH_COUNT = 5

def similar_features(base_image, overlay_image):
    #Greyscale images
    gray_base = cv2.cvtColor(base_image, cv2.COLOR_BGR2GRAY)
    gray_overlay = cv2.cvtColor(overlay_image, cv2.COLOR_BGR2GRAY)

    sift = cv2.SIFT_create()
    # find the keypoints and descriptors with SIFT
    kp1, des1 = sift.detectAndCompute(gray_base,None)
    kp2, des2 = sift.detectAndCompute(gray_overlay,None)

    index_params = dict(algorithm = 0, trees = 5)
    search_params = dict(checks = 50)

    flann = cv2.FlannBasedMatcher(index_params, search_params)
    matches = flann.knnMatch(des1,des2,k=2)

    good = []
    for m,n in matches:
        if m.distance < 0.80*n.distance:
            good.append(m)
    return good, kp1, kp2

def extracting_features(good, kp1, kp2, overlay_image, source_points, destination_points):
    if len(good)>MIN_MATCH_COUNT:
        src_pts = np.float32([ kp1[m.queryIdx].pt for m in good ]).reshape(-1,1,2)
        dst_pts = np.float32([ kp2[m.trainIdx].pt for m in good ]).reshape(-1,1,2)
        
        M, mask = cv2.findHomography(src_pts, dst_pts, cv2.RANSAC,5.0)
        # Extract rotation from the homography matrix
        theta = -np.arctan2(M[0, 1], M[0, 0]) * 180.0 / np.pi  # Convert to degrees
        if theta < 0:
            degrees = theta
            theta = degrees % 360
        # Rotate image
        img2_rotated = imutils.rotate_bound(overlay_image, -theta)
        matchesMask = mask.ravel().tolist()
        # Filter out outliers (keeping only inliers)
        inlier_matches = [m for i, m in enumerate(good) if matchesMask[i] == 1]
        # Extract the coordinates of keypoints for inlier matches
    src_pts_inliers = np.float32([kp1[m.queryIdx].pt for m in inlier_matches]).reshape(-1, 1, 2)
    dst_pts_inliers = np.float32([kp2[m.trainIdx].pt for m in inlier_matches]).reshape(-1, 1, 2)

    for i in range(len(inlier_matches)):
        src_x, src_y = src_pts_inliers[i][0]
        dst_x, dst_y = dst_pts_inliers[i][0]

        #Getting source points and destination points
        source_points.append([src_x, src_y])
        destination_points.append([dst_x, dst_y])
    return img2_rotated, theta, source_points, destination_points

def rotate_points(points, radians, origin):
    rotated_points = []
    x, y = points
    offset_x, offset_y = origin
    adjusted_x = x - offset_x
    adjusted_y = y - offset_y
    cos_rad = math.cos(radians)
    sin_rad = math.sin(radians)
    qx = offset_x + cos_rad * adjusted_x + sin_rad * adjusted_y
    qy = offset_y + -sin_rad * adjusted_x + cos_rad * adjusted_y
    rotated_points.append([qx, qy])
    return rotated_points

def rotate_points_main(overlay_image, img2_rotated, destination_points, theta):
    destination_points_rotated = []
    angle_red = np.radians(theta)
    h, w = overlay_image.shape[:2]
    origin = (w / 2, h / 2)
    for pt in destination_points:
        rotated_points = rotate_points(pt, angle_red, origin)
        h_new, w_new = img2_rotated.shape[:2]
        xoffset, yoffset = (w_new - w)/ 2, (h_new - h)/ 2
        x, y = rotated_points[-1]
        x_new, y_new = int(x + xoffset), int(y + yoffset)
        destination_points_rotated.append([x_new, y_new])
    return destination_points_rotated

def square_size(primary_points):
    #Source square
    x_cords = [points[0] for points in primary_points]
    y_cords = [points[1] for points in primary_points]

    # Find minimum and maximum x and y coordinates
    min_x = min(x_cords)
    max_x = max(x_cords)
    min_y = min(y_cords)
    max_y = max(y_cords)

    square_size = max(max_x - min_x, max_y - min_y)
    return square_size

def resize_points(points, coeff):
    resized_points = []
    for point in points:
        x, y = point
        resized_points.append([int(x * coeff), int(y * coeff)])
    return resized_points


def calculate_average_difference(points1, points2):
    points1_arr = np.array(points1)
    points2_arr = np.array(points2)
    differences = points2_arr - points1_arr
    return np.mean(differences, axis=0)

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

def warp_image(destination_image, source_image, destination_points, source_points):
    # Convert points to numpy arrays
    source_pts = np.array(source_points)
    dest_pts = np.array(destination_points)

    # Find the transformation matrix using corresponding points
    transformation_matrix = cv2.estimateAffine2D(dest_pts, source_pts)[0]
    print(transformation_matrix)

    # Warp the source image using the transformation matrix
    warped_image = cv2.warpAffine(destination_image, transformation_matrix, (source_image.shape[1], source_image.shape[0]))

    return warped_image, transformation_matrix

def feature_extraction_and_overlay(base_image, overlay_image, image_number, image_array, drone):
    source_points = []
    destination_points = []
    theta = 0

    good, kp1, kp2 = similar_features(base_image, overlay_image)

    img2_rotated, theta, source_points, destination_points = extracting_features(good, kp1,
            kp2, overlay_image, source_points, destination_points)

    rotated_points = rotate_points_main(overlay_image, img2_rotated, destination_points, theta)

    square_size_source = square_size(source_points)
    square_size_destination = square_size(rotated_points)

    # Destination image resize
    # To do after resizing square sizze need to recalculate second image points again
    coeff = square_size_source / square_size_destination
    img2_resized = cv2.resize(img2_rotated, (int(img2_rotated.shape[1] * coeff), int(img2_rotated.shape[0] * coeff)))

    new_rotated_points = resize_points(rotated_points, coeff)
    result_image, transformation_matrix = warp_image(img2_resized, base_image, new_rotated_points, source_points)

    # load image
    transparent_image = make_background_transparent(result_image)
    # Extract the foreground and alpha channels
    foreground_img = transparent_image[:, :, :3]
    alpha_mask = transparent_image[:, :, 3]

    # Create a mask for the transparent regions
    inverse_alpha_mask = cv2.bitwise_not(alpha_mask)

    # Create a masked foreground image
    masked_foreground = cv2.bitwise_and(foreground_img, foreground_img, mask=alpha_mask)

    # Create a masked background image
    masked_background = cv2.bitwise_and(image_array[image_number], image_array[image_number], mask=inverse_alpha_mask)

    # Overlay the masked foreground onto the masked background
    overlayed_image = cv2.add(masked_foreground, masked_background)

    image_array[image_number] = overlayed_image

    # Adding drone configs
    drone.average_difference = [0, 0]
    drone.coeff = coeff
    drone.rotation = theta
    drone.transformation_matrix = transformation_matrix
    drone.isWarped = True
    drone.prev_image = overlay_image
        
    return image_array, drone

def feature_extraction_and_overlay_map(base_image, base_image_points, overlay_image, overlay_image_points, image_array, image_number):
    result_image, transformation_matrix = warp_image(overlay_image, base_image, overlay_image_points, base_image_points)
    rotation = np.arctan2(transformation_matrix[0, 1], transformation_matrix[0, 0])
    rotation_angle_degrees = np.degrees(rotation)

    result_image_rotated = imutils.rotate_bound(overlay_image, -rotation_angle_degrees)
    rotated_points = rotate_points_main(overlay_image, result_image_rotated, overlay_image_points, rotation_angle_degrees)

    result_image, transformation_matrix = warp_image(result_image_rotated, base_image, rotated_points, base_image_points)

    # load image
    transparent_image = make_background_transparent(result_image)
    # Extract the foreground and alpha channels
    foreground_img = transparent_image[:, :, :3]
    alpha_mask = transparent_image[:, :, 3]

    # Create a mask for the transparent regions
    inverse_alpha_mask = cv2.bitwise_not(alpha_mask)

    # Create a masked foreground image
    masked_foreground = cv2.bitwise_and(foreground_img, foreground_img, mask=alpha_mask)

    # Create a masked background image
    masked_background = cv2.bitwise_and(image_array[image_number], image_array[image_number], mask=inverse_alpha_mask)

    # Overlay the masked foreground onto the masked background
    overlayed_image = cv2.add(masked_foreground, masked_background)

    image_array[image_number] = overlayed_image
    return image_array, transformation_matrix, rotation_angle_degrees
