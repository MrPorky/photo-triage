import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'photo.triage',
  appName: 'photo-triage',
  webDir: 'dist',
  android: {
    adjustMarginsForEdgeToEdge: 'force'
  }
};

export default config;
