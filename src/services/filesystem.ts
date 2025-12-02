import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { photoCollection } from '@/collections/photos';
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

  private thumbnailQueue: Promise<unknown> = Promise.resolve();

  private async generateThumbnail(
    uri: string,
    _ext: string,
    isVideo: boolean,
  ): Promise<string | undefined> {
    // Serialize thumbnail operations to prevent memory issues on mobile
    const task = async () => {
      try {
        console.log(
          `[FileSystem] Generating thumbnail for ${uri} (${isVideo ? 'video' : 'image'})`,
        );

        if (isVideo) {
          return await this.generateVideoThumbnail(uri);
        }
        return await this.generateImageThumbnail(uri);
      } catch (e) {
        console.error('[FileSystem] Error generating thumbnail', e);
        return undefined;
      }
    };

    // Chain the task to the queue
    const resultPromise = this.thumbnailQueue.then(task);

    // Update the queue pointer, catching errors to keep the queue alive
    this.thumbnailQueue = resultPromise.catch(() => {});

    return resultPromise;
  }

  private generateImageThumbnail(src: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          // Scale to 200px width, maintain aspect ratio
          const scale = 200 / img.width;
          canvas.width = 200;
          canvas.height = img.height * scale;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = (e) => reject(new Error(`Image load failed: ${e}`));
      img.src = src;
    });
  }

  private generateVideoThumbnail(src: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.src = src;
      video.muted = true;
      video.preload = 'metadata';
      video.playsInline = true; // Important for iOS/Android

      // Timeout to prevent hanging
      const timeout = setTimeout(() => {
        video.removeAttribute('src');
        video.load();
        reject(new Error('Video thumbnail generation timed out'));
      }, 10000);

      video.onloadeddata = () => {
        video.currentTime = 1; // Seek to 1s
      };

      video.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          // Scale to 200px width
          const scale = 200 / video.videoWidth;
          canvas.width = 200;
          canvas.height = video.videoHeight * scale;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            throw new Error('Could not get canvas context');
          }
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const url = canvas.toDataURL('image/jpeg', 0.7);

          clearTimeout(timeout);
          resolve(url);
        } catch (e) {
          clearTimeout(timeout);
          reject(e);
        } finally {
          // Cleanup
          video.removeAttribute('src');
          video.load();
        }
      };

      video.onerror = (e) => {
        clearTimeout(timeout);
        reject(new Error(`Video load failed: ${e}`));
      };
    });
  }

  async generatedThumbnailForPhoto(photo: Photo): Promise<void> {
    const thumbnail = await this.generateThumbnail(
      photo.uri,
      photo.extension,
      photo.isVideo,
    );

    if (!thumbnail) return;

    photoCollection.update(photo.id, (draft) => {
      draft.thumbnail = thumbnail;
    });
  }

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
  async loadPhotos() {
    // Mock data for browser environment
    if (!Capacitor.isNativePlatform()) {
      console.log('[FileSystem] Running in browser, returning mock data');
      return Array.from({ length: 100 }).map((_, i) => ({
        id: `mock-${i}`,
        originalName: `mock_photo_${i}.jpg`,
        status: 'camera',
        uri: `https://picsum.photos/400/400?random=${i}`,
        cameraPath: `/mock/path/${i}.jpg`,
        extension: 'jpg',
        isVideo: false,
        size: 1024 * 1024,
        modifiedTime: Date.now() - i * 1000 * 60 * 60,
      }));
    }

    try {
      console.log('[FileSystem] Starting loadPhotos...');
      await this.initializeFolders();

      // Read camera, pending and completed folders
      let [cameraFiles, pendingFiles, completedFiles] = await Promise.all([
        this.readDirectory(this.config.cameraFolder),
        this.readDirectory(this.config.pendingFolder),
        this.readDirectory(this.config.completedFolder),
      ]);

      cameraFiles = cameraFiles.filter(
        (file) =>
          !pendingFiles.includes(file) && !completedFiles.includes(file),
      );
      pendingFiles = pendingFiles.filter(
        (file) => !completedFiles.includes(file),
      );

      console.log(
        `[FileSystem] Camera: ${cameraFiles.length} files, Pending: ${pendingFiles.length} files, Completed: ${completedFiles.length} files`,
      );

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

        const existing = photoCollection.get(baseName);

        if (existing) {
          photoCollection.update(baseName, (draft) => {
            draft.status = 'camera';
            draft.uri = webUri;
            draft.cameraPath = cameraPath;
          });
        } else {
          const isVideo = this.isVideoFile(filename);
          const thumbnail = await this.generateThumbnail(webUri, ext, isVideo);

          // Camera file without camera original (shouldn't happen, but handle it)
          photoCollection.insert({
            id: baseName,
            originalName: filename,
            status: 'camera',
            uri: webUri,
            cameraPath: cameraPath,
            extension: ext,
            isVideo,
            size: fileInfo.size,
            modifiedTime: fileInfo.modifiedTime,
            thumbnail,
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

        const existing = photoCollection.get(baseName);

        if (existing) {
          photoCollection.update(baseName, (draft) => {
            draft.status = 'pending';
            draft.uri = webUri;
            draft.pendingPath = pendingPath;
          });
        } else {
          // Pending file without camera original (shouldn't happen, but handle it)
          photoCollection.insert({
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

        const photo = photoCollection.get(baseName);
        if (photo) this.generatedThumbnailForPhoto(photo);
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

        const existing = photoCollection.get(baseName);

        if (existing) {
          photoCollection.update(baseName, (draft) => {
            draft.status = 'completed';
            draft.uri = webUri;
            draft.completedPath = completedPath;
          });
        } else {
          const isVideo = this.isVideoFile(filename);
          const thumbnail = await this.generateThumbnail(webUri, ext, isVideo);

          // Completed file without camera original
          photoCollection.insert({
            id: baseName,
            originalName: filename,
            status: 'completed',
            uri: webUri,
            cameraPath: '', // No camera path for completed-only files
            completedPath,
            extension: ext,
            isVideo,
            size: fileInfo.size,
            modifiedTime: fileInfo.modifiedTime,
            thumbnail,
          });
        }
      }

      console.log(`[FileSystem] Total photos loaded: ${photoCollection.size}`);
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
        console.log('Skipping markAsPending, already pending:', photo.id);
        return { success: true }; // Already pending
      }

      if (photo.status === 'completed') {
        if (!photo.completedPath) {
          console.log(
            'No completed path available to mark as pending:',
            photo.id,
          );
          return { success: false, error: 'No completed path available' };
        }

        console.log('Marking completed photo as pending:', photo.id);
        const pendingPath = `${this.config.pendingFolder}/${photo.originalName}`;

        // Copy from completed to pending (regular file path)
        await this.copyFile(photo.completedPath, pendingPath);
        await this.deleteFile(photo.completedPath);

        console.log('Copied to pending:', pendingPath);
        return { success: true };
      }

      console.log('Marking as pending:', photo.id);
      const pendingPath = `${this.config.pendingFolder}/${photo.originalName}`;

      // Copy from camera to pending (regular file path)
      await this.copyFile(photo.cameraPath, pendingPath);

      console.log('Copied to pending:', pendingPath);
      return { success: true };
    } catch (error) {
      console.error('Error marking as pending:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Revert a photo from pending or camera back to camera only (delete from pending and completed)
   */
  async revertPhoto(photo: Photo): Promise<FileOperationResult> {
    try {
      if (photo.status === 'camera') {
        console.log('Photo is already in camera state:', photo.id);
        return { success: true }; // Already camera only
      }

      if (photo.status === 'completed') {
        if (!photo.completedPath) {
          console.log('No completed path available to revert photo:', photo.id);
          return { success: false, error: 'No completed path available' };
        }

        console.log('Reverting completed photo to camera state:', photo.id);
        await this.deleteFile(photo.completedPath);
        console.log('Deleted from completed:', photo.completedPath);
        return { success: true };
      }

      if (photo.status === 'pending') {
        if (!photo.pendingPath) {
          console.log('No pending path available to revert photo:', photo.id);
          return { success: false, error: 'No pending path available' };
        }

        console.log('Reverting pending photo to camera state:', photo.id);
        // Delete from pending folder
        await this.deleteFile(photo.pendingPath);
        console.log('Deleted from pending:', photo.pendingPath);
        return { success: true };
      }

      console.log('Invalid photo status for revert:', photo.id);
      return { success: false, error: 'Invalid photo status for revert' };
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
        console.log('Photo is already completed:', photo.id);
        return { success: true }; // Already completed
      }

      // For camera photos with content URIs, we need to read and write
      if (
        photo.status === 'camera' &&
        photo.cameraPath.startsWith('content://')
      ) {
        try {
          console.log('Completing photo from content URI:', photo.id);
          const completedPath = `${this.config.completedFolder}/${photo.originalName}`;

          console.log('Completed path for content URI:', completedPath);
          // Read from content URI (no directory parameter)
          const fileData = await Filesystem.readFile({
            path: photo.cameraPath,
          });

          console.log('Read file data from content URI:', photo.cameraPath);
          // Write to completed folder
          await Filesystem.writeFile({
            path: completedPath,
            data: fileData.data,
            directory: this.baseDirectory,
          });

          console.log('Wrote file data to completed folder:', completedPath);
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
        console.log('Completing pending photo:', photo.id);
        const baseName = this.getBaseFilename(photo.originalName);
        const ext = photo.extension;

        console.log('Reading pending directory:', this.config.pendingFolder);
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

        console.log(
          `Latest version to complete: ${latestFilename} (from ${latestPath})`,
        );
        // Copy the latest version to completed folder (using original name)
        await this.copyFile(latestPath, completedPath);

        // Delete ALL files matching this photo from pending folder
        for (const filename of files) {
          const fileBaseName = this.getBaseFilename(filename);
          const fileExt = this.getFileExtension(filename);

          if (fileBaseName === baseName && fileExt === ext) {
            console.log('Deleting pending file:', filename);
            await this.deleteFile(`${this.config.pendingFolder}/${filename}`);
          }
        }

        console.log('Completed pending photo:', photo.id);
        return { success: true };
      }

      // Shouldn't reach here, but handle gracefully
      console.log('Invalid photo status for completion:', photo.id);
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
   * Complete all pending photos
   */
  async completeAllPending(): Promise<FileOperationResult> {
    try {
      const files = await this.readDirectory(this.config.pendingFolder);

      // Group files by base name to identify unique photos
      const uniquePhotos = new Map<
        string,
        { originalName: string; extension: string }
      >();

      for (const filename of files) {
        const baseName = this.getBaseFilename(filename);
        const ext = this.getFileExtension(filename);

        // We want the clean name (without version) for the target file
        const cleanName = `${baseName}.${ext}`;

        if (!uniquePhotos.has(baseName)) {
          uniquePhotos.set(baseName, {
            originalName: cleanName,
            extension: ext,
          });
        }
      }

      console.log(
        `[FileSystem] Completing all pending: found ${uniquePhotos.size} unique photos`,
      );

      let successCount = 0;
      let failCount = 0;

      for (const { originalName, extension } of uniquePhotos.values()) {
        // Construct a minimal Photo object sufficient for completePhoto
        const photo: Photo = {
          id: originalName, // Temporary ID
          originalName,
          status: 'pending',
          uri: '',
          cameraPath: '',
          pendingPath: '', // completePhoto will find the files
          extension,
          isVideo: this.isVideoFile(originalName),
          size: 0,
          modifiedTime: 0,
        };

        const result = await this.completePhoto(photo);
        if (result.success) {
          successCount++;
        } else {
          failCount++;
          console.error(`Failed to complete ${originalName}: ${result.error}`);
        }
      }

      if (failCount > 0) {
        return {
          success: false,
          error: `Completed ${successCount} photos, failed ${failCount}`,
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Error completing all pending:', error);
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
