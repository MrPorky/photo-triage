import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import StorageAccess from '../plugins/storageAccess';
import type { FileOperationResult, FolderConfig, Photo } from '../types/photo';

/**
 * Service to handle all file system operations for the photo triage app
 */
class FileSystemService {
  private config: FolderConfig = {
    cameraFolder: 'DCIM/Camera',
    pendingFolder: 'Pictures/PhotoTriage/Pending',
    completedFolder: 'Pictures/PhotoTriage/Completed',
  };

  // Directory to use for app-specific folders (pending/completed)
  // Using Documents directory for better accessibility in file managers
  private readonly baseDirectory = Directory.ExternalStorage;

  // Supported image and video formats
  private readonly imageExtensions = [
    'jpg',
    'jpeg',
    'png',
    'gif',
    'webp',
    'heic',
    'heif',
  ];
  private readonly videoExtensions = [
    'mp4',
    'mov',
    'avi',
    'mkv',
    'webm',
    '3gp',
  ];

  /**
   * Initialize the app folders (pending and completed)
   */
  async initializeFolders(): Promise<void> {
    try {
      // Create camera demo folder
      await Filesystem.mkdir({
        path: this.config.cameraFolder,
        directory: this.baseDirectory,
        recursive: true,
      }).catch(() => {
        // Folder might already exist, ignore error
      });

      // Create pending folder if it doesn't exist
      await Filesystem.mkdir({
        path: this.config.pendingFolder,
        directory: this.baseDirectory,
        recursive: true,
      }).catch(() => {
        // Folder might already exist, ignore error
      });

      // Create completed folder if it doesn't exist
      await Filesystem.mkdir({
        path: this.config.completedFolder,
        directory: this.baseDirectory,
        recursive: true,
      }).catch(() => {
        // Folder might already exist, ignore error
      });
    } catch (error) {
      console.error('Error initializing folders:', error);
      throw error;
    }
  }

  /**
   * Check if a file extension is supported
   */
  private isSupportedFile(filename: string): boolean {
    const ext = this.getFileExtension(filename);
    return [...this.imageExtensions, ...this.videoExtensions].includes(ext);
  }

  /**
   * Check if a file is a video
   */
  private isVideoFile(filename: string): boolean {
    const ext = this.getFileExtension(filename);
    return this.videoExtensions.includes(ext);
  }

  /**
   * Get file extension without the dot
   */
  private getFileExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
  }

  /**
   * Get the base filename without version number
   * Example: "IMG_1234~2.jpg" -> "IMG_1234"
   */
  private getBaseFilename(filename: string): string {
    const ext = this.getFileExtension(filename);
    const nameWithoutExt = filename.slice(0, -(ext.length + 1));

    // Remove version number if present (e.g., ~1, ~2, etc.)
    const versionMatch = nameWithoutExt.match(/^(.+)~\d+$/);
    return versionMatch ? versionMatch[1] : nameWithoutExt;
  }

  /**
   * Extract version number from filename
   * Example: "IMG_1234~2.jpg" -> 2, "IMG_1234.jpg" -> 0
   */
  private getVersionNumber(filename: string): number {
    const ext = this.getFileExtension(filename);
    const nameWithoutExt = filename.slice(0, -(ext.length + 1));
    const versionMatch = nameWithoutExt.match(/~(\d+)$/);
    return versionMatch ? parseInt(versionMatch[1], 10) : 0;
  }

  /**
   * Read all files from a directory
   */
  private async readDirectory(path: string): Promise<string[]> {
    try {
      const result = await Filesystem.readdir({
        path,
        directory: this.baseDirectory,
      });
      return result.files
        .filter((file) => this.isSupportedFile(file.name))
        .map((file) => file.name);
    } catch (error) {
      console.error(`Error reading directory ${path}:`, error);
      return [];
    }
  }

  /**
   * Get file info (size, modified time)
   */
  private async getFileInfo(path: string) {
    try {
      const stat = await Filesystem.stat({
        path,
        directory: this.baseDirectory,
      });
      return {
        size: stat.size,
        modifiedTime: stat.mtime || Date.now(),
      };
    } catch (error) {
      console.error(`Error getting file info for ${path}:`, error);
      return {
        size: 0,
        modifiedTime: Date.now(),
      };
    }
  }

  /**
   * Check and request media permissions if needed
   */
  async ensureMediaPermissions(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      return true; // Web doesn't need permissions
    }

    try {
      const status = await StorageAccess.checkPermissions();
      console.log('[StorageAccess] Storage access status:', status.storage);

      if (status.storage === 'granted') {
        return true;
      }

      const result = await StorageAccess.requestPermissions();
      console.log(
        '[StorageAccess] Storage access request result:',
        result.storage,
      );
      return result.storage === 'granted';
    } catch (error) {
      console.error('Error checking permissions:', error);
      return false;
    }
  }

  /**
   * Load all photos from camera, pending, and completed folders
   */
  async loadPhotos(): Promise<Photo[]> {
    try {
      console.log('[FileSystem] Starting loadPhotos...');
      await this.initializeFolders();

      // Read camera, pending and completed folders
      const [cameraFiles, pendingFiles, completedFiles] = await Promise.all([
        this.readDirectory(this.config.cameraFolder),
        this.readDirectory(this.config.pendingFolder),
        this.readDirectory(this.config.completedFolder),
      ]);

      console.log(
        `[FileSystem] Camera: ${cameraFiles.length} files, Pending: ${pendingFiles.length} files, Completed: ${completedFiles.length} files`,
      );

      // Create a map to track photos by their base filename
      const photoMap = new Map<string, Photo>();

      // Process camera files
      for (const filename of cameraFiles) {
        const baseName = this.getBaseFilename(filename);
        const ext = this.getFileExtension(filename);
        const cameraPath = `${this.config.cameraFolder}/${filename}`;
        const fileInfo = await this.getFileInfo(cameraPath);

        // Get the full file URI and convert it for web access
        const fileUri = await Filesystem.getUri({
          path: cameraPath,
          directory: this.baseDirectory,
        });
        const webUri = Capacitor.convertFileSrc(fileUri.uri);

        const existing = photoMap.get(baseName);
        if (existing) {
          existing.status = 'camera';
          existing.uri = webUri;
          existing.cameraPath = cameraPath;
        } else {
          // Camera file without camera original (shouldn't happen, but handle it)
          photoMap.set(baseName, {
            id: baseName,
            originalName: filename,
            status: 'camera',
            uri: webUri,
            cameraPath: cameraPath,
            extension: ext,
            isVideo: this.isVideoFile(filename),
            size: fileInfo.size,
            modifiedTime: fileInfo.modifiedTime,
          });
        }
      }

      // Update with pending files (they override camera display)
      for (const filename of pendingFiles) {
        const baseName = this.getBaseFilename(filename);
        const ext = this.getFileExtension(filename);
        const pendingPath = `${this.config.pendingFolder}/${filename}`;
        const fileInfo = await this.getFileInfo(pendingPath);

        // Get the full file URI and convert it for web access
        const fileUri = await Filesystem.getUri({
          path: pendingPath,
          directory: this.baseDirectory,
        });
        const webUri = Capacitor.convertFileSrc(fileUri.uri);

        const existing = photoMap.get(baseName);
        if (existing) {
          existing.status = 'pending';
          existing.uri = webUri;
          existing.pendingPath = pendingPath;
        } else {
          // Pending file without camera original (shouldn't happen, but handle it)
          photoMap.set(baseName, {
            id: baseName,
            originalName: filename,
            status: 'pending',
            uri: webUri,
            cameraPath: '', // No camera path for pending-only files
            pendingPath,
            extension: ext,
            isVideo: this.isVideoFile(filename),
            size: fileInfo.size,
            modifiedTime: fileInfo.modifiedTime,
          });
        }
      }

      // Update with completed files (they override everything)
      for (const filename of completedFiles) {
        const baseName = this.getBaseFilename(filename);
        const ext = this.getFileExtension(filename);
        const completedPath = `${this.config.completedFolder}/${filename}`;
        const fileInfo = await this.getFileInfo(completedPath);

        // Get the full file URI and convert it for web access
        const fileUri = await Filesystem.getUri({
          path: completedPath,
          directory: this.baseDirectory,
        });
        const webUri = Capacitor.convertFileSrc(fileUri.uri);

        const existing = photoMap.get(baseName);
        if (existing) {
          existing.status = 'completed';
          existing.uri = webUri;
          existing.completedPath = completedPath;
        } else {
          // Completed file without camera original
          photoMap.set(baseName, {
            id: baseName,
            originalName: filename,
            status: 'completed',
            uri: webUri,
            cameraPath: '', // No camera path for completed-only files
            completedPath,
            extension: ext,
            isVideo: this.isVideoFile(filename),
            size: fileInfo.size,
            modifiedTime: fileInfo.modifiedTime,
          });
        }
      }

      // Convert map to array and sort by modified time (newest first)
      const photos = Array.from(photoMap.values()).sort(
        (a, b) => b.modifiedTime - a.modifiedTime,
      );

      console.log(`[FileSystem] Total photos loaded: ${photos.length}`);
      return photos;
    } catch (error) {
      console.error('[FileSystem] Error loading photos:', error);
      throw error;
    }
  }

  /**
   * Copy a file from source to destination
   */
  private async copyFile(from: string, to: string): Promise<void> {
    await Filesystem.copy({
      from,
      to,
      directory: this.baseDirectory,
      toDirectory: this.baseDirectory,
    });
  }

  /**
   * Delete a file
   */
  private async deleteFile(path: string): Promise<void> {
    await Filesystem.deleteFile({
      path,
      directory: this.baseDirectory,
    });
  }

  /**
   * Move a photo to pending (copy from camera to pending)
   */
  async markAsPending(photo: Photo): Promise<FileOperationResult> {
    try {
      if (photo.status === 'pending') {
        return { success: true }; // Already pending
      }

      if (photo.status === 'completed') {
        return {
          success: false,
          error: 'Cannot mark completed photo as pending',
        };
      }

      const pendingPath = `${this.config.pendingFolder}/${photo.originalName}~1`;

      // Copy from camera to pending (regular file path)
      await this.copyFile(photo.cameraPath, pendingPath);

      return { success: true };
    } catch (error) {
      console.error('Error marking as pending:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Remove from pending (delete from pending folder)
   */
  async removeFromPending(photo: Photo): Promise<FileOperationResult> {
    try {
      if (photo.status !== 'pending' || !photo.pendingPath) {
        return { success: false, error: 'Photo is not in pending' };
      }

      // Delete from pending folder
      await this.deleteFile(photo.pendingPath);

      return { success: true };
    } catch (error) {
      console.error('Error removing from pending:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Complete a photo (move latest version to completed, delete all other copies)
   * This implements the "Complete Action" from the PRD
   */
  async completePhoto(photo: Photo): Promise<FileOperationResult> {
    try {
      if (photo.status === 'completed') {
        return { success: true }; // Already completed
      }

      // For camera photos with content URIs, we need to read and write
      if (
        photo.status === 'camera' &&
        photo.cameraPath.startsWith('content://')
      ) {
        try {
          const completedPath = `${this.config.completedFolder}/${photo.originalName}`;

          // Read from content URI (no directory parameter)
          const fileData = await Filesystem.readFile({
            path: photo.cameraPath,
          });

          // Write to completed folder
          await Filesystem.writeFile({
            path: completedPath,
            data: fileData.data,
            directory: this.baseDirectory,
          });

          return { success: true };
        } catch (error) {
          console.error('Error completing from content URI:', error);
          return {
            success: false,
            error: `Failed to complete from MediaStore: ${error}`,
          };
        }
      }

      // For pending photos, find the latest version in pending folder
      if (photo.status === 'pending') {
        const baseName = this.getBaseFilename(photo.originalName);
        const ext = photo.extension;
        const files = await this.readDirectory(this.config.pendingFolder);

        // Find all versions of this photo in pending folder
        const versions: { filename: string; version: number }[] = [];

        for (const filename of files) {
          const fileBaseName = this.getBaseFilename(filename);
          const fileExt = this.getFileExtension(filename);

          if (fileBaseName === baseName && fileExt === ext) {
            versions.push({
              filename,
              version: this.getVersionNumber(filename),
            });
          }
        }

        // Find the highest version (or use original if no versions)
        let latestFilename = photo.originalName;
        if (versions.length > 0) {
          const latest = versions.reduce((prev, current) =>
            current.version > prev.version ? current : prev,
          );
          latestFilename = latest.filename;
        }

        const latestPath = `${this.config.pendingFolder}/${latestFilename}`;
        const completedPath = `${this.config.completedFolder}/${photo.originalName}`;

        // Copy the latest version to completed folder (using original name)
        await this.copyFile(latestPath, completedPath);

        // Delete ALL files matching this photo from pending folder
        for (const filename of files) {
          const fileBaseName = this.getBaseFilename(filename);
          const fileExt = this.getFileExtension(filename);

          if (fileBaseName === baseName && fileExt === ext) {
            await this.deleteFile(`${this.config.pendingFolder}/${filename}`);
          }
        }

        return { success: true };
      }

      // Shouldn't reach here, but handle gracefully
      return {
        success: false,
        error: 'Invalid photo status for completion',
      };
    } catch (error) {
      console.error('Error completing photo:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Get folder configuration
   */
  getFolderConfig(): FolderConfig {
    return { ...this.config };
  }
}

// Export a singleton instance
export const fileSystemService = new FileSystemService();
