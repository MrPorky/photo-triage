import { registerPlugin } from '@capacitor/core';

export interface StorageAccessPlugin {
  /**
   * Check if media permissions are granted
   */
  checkPermissions(): Promise<{ storage: 'granted' | 'denied' | 'prompt' }>;

  /**
   * Request media permissions
   */
  requestPermissions(): Promise<{ storage: 'granted' | 'denied' | 'prompt' }>;
}

const StorageAccess = registerPlugin<StorageAccessPlugin>('StorageAccess');

export default StorageAccess;
