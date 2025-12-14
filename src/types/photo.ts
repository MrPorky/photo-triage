import type z from 'zod';
import type { photoSchema } from '@/zod/photo';

/**
 * Represents the state/location of a photo in the triage system
 */
export type PhotoStatus = 'camera' | 'pending' | 'completed';

/**
 * Represents a photo or video in the gallery
 */
export type Photo = z.infer<typeof photoSchema>;

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
