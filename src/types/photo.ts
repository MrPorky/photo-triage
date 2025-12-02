/**
 * Represents the state/location of a photo in the triage system
 */
export type PhotoStatus = 'camera' | 'pending' | 'completed';

/**
 * Represents a photo or video in the gallery
 */
export interface Photo {
  /** Unique identifier - based on original filename */
  id: string;

  /** Original filename from camera folder */
  originalName: string;

  /** Current status/location of the photo */
  status: PhotoStatus;

  /** Full path to the file to display (can be in camera, pending, or completed folder) */
  uri: string;

  /** Path to the original file in the camera folder */
  cameraPath: string;

  /** Path in the pending folder (if exists) */
  pendingPath?: string;

  /** Path in the completed folder (if exists) */
  completedPath?: string;

  /** File extension (jpg, png, mp4, etc) */
  extension: string;

  /** Whether this is a video file */
  isVideo: boolean;

  /** File size in bytes */
  size: number;

  /** Modified timestamp */
  modifiedTime: number;

  /** Thumbnail URI (base64 or blob url) */
  thumbnail?: string;
}

/**
 * Result of a file operation
 */
export interface FileOperationResult {
  success: boolean;
  error?: string;
}

/**
 * Configuration for folder paths
 */
export interface FolderConfig {
  /** Path to the device's camera/DCIM folder */
  cameraFolder: string;

  /** Path to the app's pending folder */
  pendingFolder: string;

  /** Path to the app's completed folder */
  completedFolder: string;
}
